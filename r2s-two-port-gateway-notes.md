# R2S iStoreOS Two-Port Gateway Setup

This note records the final reusable setup for making NanoPi R2S / iStoreOS act as a two-port downstream gateway.

## Target Topology

```text
iKuai / upstream router: 192.168.1.1/24
Upstream switch:         192.168.1.0/24

R2S WAN / eth0:          192.168.1.15/24
R2S LAN / eth1/br-lan:   192.168.8.1/24

Downstream clients:      192.168.8.100 - 192.168.8.249
Downstream gateway:      192.168.8.1
Downstream DNS:          192.168.8.1
```

Cable layout after applying config:

```text
Upstream switch / iKuai LAN -> R2S WAN / eth0
R2S LAN / eth1             -> downstream PC or downstream switch
```

## iKuai Static Route

Add this on iKuai before or immediately after the R2S cutover:

```text
Destination: 192.168.8.0
Netmask:     255.255.255.0
Gateway:     192.168.1.15
Priority:    1
Remark:      R2S
Status:      Enabled
```

This route is required for upstream `192.168.1.0/24` devices to access downstream `192.168.8.0/24` devices.

## One-Shot R2S Script

Run this on the R2S through SSH while it is still reachable. In our case the temporary reachable address was `192.168.1.22`.

Example:

```sh
ssh root@192.168.1.22
```

Then paste and run:

```sh
set -eu

echo "Applying final R2S two-port gateway config..."

# Network: eth0 is upstream WAN, br-lan/eth1 is downstream LAN.
uci set network.wan.device='eth0'
uci set network.wan.proto='static'
uci set network.wan.ipaddr='192.168.1.15'
uci set network.wan.netmask='255.255.255.0'
uci set network.wan.gateway='192.168.1.1'
uci -q delete network.wan.dns || true
uci add_list network.wan.dns='192.168.1.1'
uci add_list network.wan.dns='223.5.5.5'

uci set network.wan6.device='eth0'
uci set network.wan6.proto='dhcpv6'

uci set network.lan.device='br-lan'
uci set network.lan.proto='static'
uci set network.lan.ipaddr='192.168.8.1'
uci set network.lan.netmask='255.255.255.0'
uci set network.lan.ip6assign='60'

# Disable temporary planb-on-LAN fallback if present.
uci -q set network.planb.auto='0' || true

# DHCP for downstream clients.
uci set dhcp.lan.interface='lan'
uci set dhcp.lan.start='100'
uci set dhcp.lan.limit='150'
uci set dhcp.lan.leasetime='12h'
uci set dhcp.lan.dhcpv4='server'
uci set dhcp.lan.force='1'
uci -q delete dhcp.lan.ignore || true
uci set dhcp.wan.ignore='1'

# Firewall zones and forwarding.
uci set firewall.@zone[0].name='lan'
uci -q delete firewall.@zone[0].network || true
uci add_list firewall.@zone[0].network='lan'
uci set firewall.@zone[0].input='ACCEPT'
uci set firewall.@zone[0].output='ACCEPT'
uci set firewall.@zone[0].forward='ACCEPT'

uci set firewall.@zone[1].name='wan'
uci -q delete firewall.@zone[1].network || true
uci add_list firewall.@zone[1].network='wan'
uci add_list firewall.@zone[1].network='wan6'
uci set firewall.@zone[1].input='REJECT'
uci set firewall.@zone[1].output='ACCEPT'
uci set firewall.@zone[1].forward='REJECT'
uci set firewall.@zone[1].masq='1'
uci set firewall.@zone[1].mtu_fix='1'

# Do not NAT traffic from downstream to upstream LAN.
# This keeps 192.168.8.x visible when talking to 192.168.1.x.
uci -q delete firewall.@zone[1].masq_dest || true
uci add_list firewall.@zone[1].masq_dest='!192.168.1.0/24'

# Allow upstream LAN devices to reach downstream devices.
if ! uci show firewall | grep -q "Allow-Upstream-to-Downstream"; then
  idx=$(uci add firewall rule)
  uci set firewall.$idx.name='Allow-Upstream-to-Downstream'
  uci set firewall.$idx.src='wan'
  uci set firewall.$idx.dest='lan'
  uci set firewall.$idx.src_ip='192.168.1.0/24'
  uci set firewall.$idx.dest_ip='192.168.8.0/24'
  uci set firewall.$idx.proto='all'
  uci set firewall.$idx.target='ACCEPT'
fi

# Allow management of R2S from upstream LAN.
if ! uci show firewall | grep -q "Allow-Upstream-R2S-Management"; then
  idx=$(uci add firewall rule)
  uci set firewall.$idx.name='Allow-Upstream-R2S-Management'
  uci set firewall.$idx.src='wan'
  uci set firewall.$idx.src_ip='192.168.1.0/24'
  uci set firewall.$idx.proto='tcp'
  uci set firewall.$idx.dest_port='22 80 443'
  uci set firewall.$idx.target='ACCEPT'
fi

uci commit network
uci commit dhcp
uci commit firewall

echo "Committed config. Restarting network services now; SSH may disconnect."
/etc/init.d/network restart
/etc/init.d/dnsmasq restart
/etc/init.d/odhcpd restart
/etc/init.d/firewall restart

echo "Cutover now: upstream switch -> WAN/eth0, downstream PC/switch -> LAN/eth1."
```

## Why `dhcp.lan.force=1` Is Included

During the cutover, the LAN port may temporarily still be connected to the upstream network. iStoreOS/dnsmasq can detect another DHCP server on `br-lan` and refuse to publish the downstream DHCP range.

The symptom is:

```text
Downstream PC cannot get 192.168.8.x
dnsmasq log says another DHCP server exists on br-lan
dnsmasq is not listening on UDP 67
```

The fix is included in the script:

```sh
uci set dhcp.lan.force='1'
uci commit dhcp
/etc/init.d/dnsmasq restart
```

## Verification After Cutover

From the upstream network:

```sh
ping 192.168.1.15
ssh root@192.168.1.15
```

On R2S:

```sh
ip -br addr show eth0
ip -br addr show eth1
ip -br addr show br-lan
ip route
uci get network.wan.ipaddr
uci get network.lan.ipaddr
uci show dhcp.lan
netstat -lnup | grep ':67'
```

Expected:

```text
eth0:   UP 192.168.1.15/24
br-lan: UP 192.168.8.1/24
default route via 192.168.1.1 dev eth0
dnsmasq listening on UDP 67
```

On downstream PC:

```cmd
ipconfig /release
ipconfig /renew
ipconfig
ping 192.168.8.1
ping 192.168.1.1
ping 192.168.1.15
```

Expected downstream DHCP:

```text
IP:      192.168.8.x
Gateway: 192.168.8.1
DNS:     192.168.8.1
```

## Proxy Plugin Notes

For PassWall, OpenClash, SSR Plus, or similar transparent proxy plugins, keep private networks direct:

```text
192.168.0.0/16
10.0.0.0/8
172.16.0.0/12
127.0.0.0/8
224.0.0.0/4
```

At minimum, `192.168.1.0/24` must be direct so downstream clients can access upstream devices normally.

## Optional Service Cleanup

These were removed because this R2S is only used as a gateway, not as storage, Docker host, phone manager, or web terminal:

```sh
opkg remove \
  luci-i18n-samba4-zh-cn luci-i18n-nfs-zh-cn luci-i18n-unishare-zh-cn \
  luci-i18n-cifs-mount-zh-cn luci-i18n-linkease-zh-cn luci-i18n-ttyd-zh-cn \
  luci-i18n-dockerman-zh-cn \
  luci-app-unishare luci-app-samba4 luci-app-nfs luci-app-cifs-mount \
  luci-app-linkease luci-app-dockerman luci-app-ttyd luci-proto-modemmanager \
  unishare webdav2 samba4-server wsdd2 \
  nfs-kernel-server-utils nfs-kernel-server nfs-utils rpcbind cifsmount \
  linkease adb-enablemodem adb usbmuxd modemmanager \
  docker-compose docker dockerd containerd runc luci-lib-docker ttyd
```

After Docker removal, remove stale Docker firewall config if it exists:

```sh
uci -q delete firewall.docker_nat || true
uci commit firewall
/etc/init.d/firewall reload || /etc/init.d/firewall restart
```

Do not remove these gateway-critical services:

```text
network
firewall
dnsmasq
odhcpd
dropbear
uhttpd
rpcd
```
