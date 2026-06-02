# R2S iStoreOS Downstream Gateway + Nikki Runbook

This runbook recreates the setup from zero: NanoPi R2S/iStoreOS as a two-port downstream gateway, iKuai as upstream router, and Nikki/Mihomo as the LAN transparent proxy.

## How To Hand This To Another LLM

Use this whole file as the source of truth. Give the next model/operator this instruction:

```text
You are deploying a NanoPi R2S with iStoreOS as a two-port downstream gateway behind iKuai.
Follow the runbook exactly. Replace only the variables in the "Deployment Variables" section.
Do not enable IPv6. Do not run OpenClash and Nikki together. Do not enable url-test, fallback,
load-balance, provider health-check, or bulk node tests because the nodes may be Cloudflare-backed.
After each major step, run the verification commands in the runbook and report the exact output.
```

Correct execution order:

1. Confirm variables and current access address.
2. Add the iKuai static route.
3. Apply the R2S base network script.
4. Move cables to the final topology.
5. Verify downstream DHCP and two-way LAN reachability.
6. Optional cleanup of unused services.
7. Install Nikki, import a Clash/Mihomo YAML profile, and disable OpenClash.
8. Apply the manual-select AI/YouTube/Dev mixin.
9. Verify Mihomo config, Dashboard, and downstream browsing.

## Deployment Variables

Change these values for the next site before running commands:

```text
R2S temporary SSH address:       192.168.1.22
R2S final WAN IP:                192.168.1.15
iKuai / upstream gateway:        192.168.1.1
Upstream subnet:                 192.168.1.0/24
R2S downstream LAN IP:           192.168.8.1
Downstream subnet:               192.168.8.0/24
Downstream DHCP range:           192.168.8.100-192.168.8.249
R2S WAN interface:               eth0
R2S LAN bridge/interface:        br-lan / eth1
Proxy profile source:            Clash/Mihomo YAML from subscription, V2rayN conversion, or OpenClash
```

Do not hard-code the root password into this file. Use `ssh root@<temporary-ip>` or `sshpass -p '<password>' ssh root@<temporary-ip>` only during the live deployment.

## Target Result

```text
iKuai upstream LAN:       192.168.1.1/24
R2S WAN / eth0:           192.168.1.15/24
R2S LAN / br-lan / eth1:  192.168.8.1/24
Downstream DHCP:          192.168.8.100 - 192.168.8.249
Downstream gateway/DNS:   192.168.8.1
Proxy client:             Nikki + Mihomo
IPv6:                     disabled
OpenClash:                optional fallback only, disabled if Nikki is used
```

Verified snapshot from this deployment on 2026-06-02:

```text
Device:                   FriendlyElec NanoPi R2S | Plus
iStoreOS:                 24.10.6 2026041710
Kernel:                   6.6.127
R2S WAN / eth0:           192.168.1.15/24
R2S LAN / br-lan:         192.168.8.1/24
Nikki:                    running
OpenClash:                inactive
Mihomo config test:        successful
Dashboard/API:            TCP 9090
Business groups:          manual select only
Automatic probing groups: none
```

Cable layout after cutover:

```text
iKuai / upstream switch -> R2S WAN / eth0
R2S LAN / eth1          -> downstream PC or downstream switch
```

## iKuai Configuration

Keep iKuai DHCP gateway as iKuai itself:

```text
DHCP gateway: 192.168.1.1
Do not set iKuai DHCP gateway to R2S.
```

Add static route on iKuai:

```text
Destination: 192.168.8.0
Netmask:     255.255.255.0
Gateway:     192.168.1.15
Priority:    1
Remark:      R2S
Status:      Enabled
```

This enables upstream `192.168.1.0/24` devices to reach downstream `192.168.8.0/24`.

## R2S Base Network Script

Run this while R2S is still reachable by SSH. Example temporary address:

```sh
ssh root@192.168.1.22
```

Paste:

```sh
set -eu

echo "Applying R2S two-port downstream gateway config..."

uci set network.wan.device='eth0'
uci set network.wan.proto='static'
uci set network.wan.ipaddr='192.168.1.15'
uci set network.wan.netmask='255.255.255.0'
uci set network.wan.gateway='192.168.1.1'
uci -q delete network.wan.dns || true
uci add_list network.wan.dns='192.168.1.1'
uci add_list network.wan.dns='223.5.5.5'

uci set network.wan6.device='eth0'
uci set network.wan6.proto='none'
uci set network.wan6.auto='0'

uci set network.lan.device='br-lan'
uci set network.lan.proto='static'
uci set network.lan.ipaddr='192.168.8.1'
uci set network.lan.netmask='255.255.255.0'
uci -q delete network.lan.ip6assign || true
uci -q delete network.globals.ula_prefix || true
uci -q set network.planb.auto='0' || true

uci set dhcp.lan.interface='lan'
uci set dhcp.lan.start='100'
uci set dhcp.lan.limit='150'
uci set dhcp.lan.leasetime='12h'
uci set dhcp.lan.dhcpv4='server'
uci set dhcp.lan.force='1'
uci -q delete dhcp.lan.ignore || true
uci set dhcp.lan.dhcpv6='disabled'
uci set dhcp.lan.ra='disabled'
uci set dhcp.lan.ndp='disabled'
uci -q delete dhcp.lan.ra_slaac || true
uci -q delete dhcp.lan.ra_flags || true
uci set dhcp.wan.ignore='1'

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
uci -q delete firewall.@zone[1].masq_dest || true
uci add_list firewall.@zone[1].masq_dest='!192.168.1.0/24'

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

/etc/init.d/odhcpd stop || true
/etc/init.d/odhcpd disable || true
/etc/init.d/network restart
/etc/init.d/dnsmasq restart
/etc/init.d/firewall restart

echo "Cutover now: upstream switch -> WAN/eth0, downstream PC/switch -> LAN/eth1."
```

After cable cutover, manage R2S at:

```text
Upstream side:   http://192.168.1.15
Downstream side: http://192.168.8.1
```

## Base Verification

On R2S:

```sh
ip -br addr show eth0
ip -br addr show br-lan
ip route
netstat -lnup | grep ':67'
```

Expected:

```text
eth0   UP 192.168.1.15/24
br-lan UP 192.168.8.1/24
default via 192.168.1.1 dev eth0
dnsmasq listening on UDP 67
```

On downstream Windows PC:

```cmd
ipconfig /release
ipconfig /renew
ipconfig /flushdns
ipconfig
ping 192.168.8.1
ping 192.168.1.1
ping 192.168.1.15
```

Expected:

```text
IP:      192.168.8.x
Gateway: 192.168.8.1
DNS:     192.168.8.1
```

## Optional Service Cleanup

For a gateway-only R2S, remove storage/Docker/phone/terminal packages:

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

Do not remove:

```text
network firewall dnsmasq odhcpd dropbear uhttpd rpcd
```

Clean stale Docker firewall rule if present:

```sh
uci -q delete firewall.docker_nat || true
uci commit firewall
/etc/init.d/firewall reload || /etc/init.d/firewall restart
```

## Install Nikki

System requirements matched in this deployment:

```text
iStoreOS 24.10.6
kernel 6.6
firewall4 / nftables
aarch64_generic
```

Install:

```sh
wget -O - https://github.com/nikkinikki-org/OpenWrt-nikki/raw/refs/heads/main/feed.sh | ash
opkg install nikki luci-app-nikki luci-i18n-nikki-zh-cn
```

If OpenClash is installed, do not run both. Stop OpenClash:

```sh
/etc/init.d/openclash stop || true
/etc/init.d/openclash disable || true
```

## Import Clash/Mihomo YAML Into Nikki

If the user has a Clash/Mihomo YAML from V2rayN/subscription conversion, place it under `/etc/nikki/profiles/`.

Generic example:

```text
/etc/nikki/profiles/main.yaml
```

Example using an existing OpenClash config:

```sh
mkdir -p /etc/nikki/profiles
cp -f /etc/openclash/config/cf_cloudns.yaml /etc/nikki/profiles/main.yaml
chmod 0644 /etc/nikki/profiles/main.yaml
```

Configure Nikki for LAN-only transparent proxy. Replace `main.yaml` if the profile file has a different name:

```sh
uci set nikki.config.profile='file:main.yaml'
uci set nikki.config.enabled='1'
uci set nikki.config.test_profile='0'
uci set nikki.config.core_only='0'
uci set nikki.config.scheduled_restart='0'

uci set nikki.mixin.ipv6='0'
uci set nikki.mixin.dns_ipv6='0'
uci set nikki.procd.env_skip_system_ipv6_check='1'

uci set nikki.proxy.enabled='1'
uci set nikki.proxy.router_proxy='0'
uci set nikki.proxy.lan_proxy='1'
uci set nikki.proxy.lan_inbound_interface='lan'
uci set nikki.proxy.ipv4_dns_hijack='1'
uci set nikki.proxy.ipv6_dns_hijack='0'
uci set nikki.proxy.ipv4_proxy='1'
uci set nikki.proxy.ipv6_proxy='0'
uci set nikki.proxy.tcp_mode='redirect'
uci set nikki.proxy.udp_mode='tun'

uci set nikki.mixin.authentication='1'
uci -q delete nikki.@authentication[0].enabled || true
uci set nikki.@authentication[0].enabled='0'

uci commit nikki
```

## Nikki AI/YouTube/Dev Mixin

This mixin adds manual select groups only. It does not add `url-test`, `fallback`, `load-balance`, or provider health checks. This avoids consuming Cloudflare node connection counts.

Generate mixin from the active local profile so every business group can directly select any node:

```sh
PROFILE_ID="$(uci get nikki.config.profile | sed 's/^file://')"
PROFILE="/etc/nikki/profiles/$PROFILE_ID"
MIXIN=/etc/nikki/mixin.yaml

[ -s "$PROFILE" ] || {
  echo "Active Nikki profile not found or empty: $PROFILE"
  exit 1
}

cp -f "$MIXIN" "$MIXIN.bak-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

{
cat <<'EOF'
# Nikki mixin for AI-heavy downstream gateway.
# Explicit node lists are used because many subscriptions use inline proxies.
# All groups are manual select groups; no url-test/fallback/load-balance is added.

nikki-proxy-groups:
EOF

node_lines="$(yq -r '.proxies[].name' "$PROFILE" | sed 's/"/\\"/g' | awk '{print "      - \"" $0 "\""}')"

emit_group() {
  name="$1"
  shift
  echo "  - name: \"$name\""
  echo "    type: select"
  echo "    proxies:"
  for p in "$@"; do
    echo "      - \"$p\""
  done
  printf "%s\n" "$node_lines"
  echo
}

emit_group "🤖 AI" "🚀 节点选择" "🐟 漏网之鱼" "DIRECT"
emit_group "🔥 强AI" "🤖 AI" "🚀 节点选择" "🐟 漏网之鱼" "DIRECT"
emit_group "🌿 弱AI" "🤖 AI" "🚀 节点选择" "🐟 漏网之鱼" "DIRECT"
emit_group "📺 YouTube" "🚀 节点选择" "🐟 漏网之鱼" "DIRECT"
emit_group "🔧 Dev/API" "🚀 节点选择" "🐟 漏网之鱼" "DIRECT"
emit_group "☁️ Cloudflare" "🚀 节点选择" "🐟 漏网之鱼" "DIRECT"
emit_group "🐟 AI-FINAL" "🚀 节点选择" "🐟 漏网之鱼" "DIRECT"

cat <<'EOF'
nikki-rules:
  - IP-CIDR,0.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,10.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,100.64.0.0/10,DIRECT,no-resolve
  - IP-CIDR,127.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,169.254.0.0/16,DIRECT,no-resolve
  - IP-CIDR,172.16.0.0/12,DIRECT,no-resolve
  - IP-CIDR,192.168.0.0/16,DIRECT,no-resolve
  - IP-CIDR,224.0.0.0/4,DIRECT,no-resolve
  - DOMAIN-SUFFIX,lan,DIRECT
  - DOMAIN-SUFFIX,local,DIRECT
  - DOMAIN-SUFFIX,localhost,DIRECT

  - DOMAIN,api.openai.com,🔥 强AI
  - DOMAIN,chatgpt.com,🔥 强AI
  - DOMAIN-SUFFIX,chatgpt.com,🔥 强AI
  - DOMAIN-SUFFIX,openai.com,🔥 强AI
  - DOMAIN-SUFFIX,oaistatic.com,🔥 强AI
  - DOMAIN-SUFFIX,oaiusercontent.com,🔥 强AI
  - DOMAIN,api.anthropic.com,🔥 强AI
  - DOMAIN-SUFFIX,anthropic.com,🔥 强AI
  - DOMAIN-SUFFIX,claude.ai,🔥 强AI
  - DOMAIN-SUFFIX,githubcopilot.com,🔥 强AI
  - DOMAIN-SUFFIX,copilot.microsoft.com,🔥 强AI
  - DOMAIN-SUFFIX,api.copilot.microsoft.com,🔥 强AI

  - DOMAIN,gemini.google.com,🌿 弱AI
  - DOMAIN,aistudio.google.com,🌿 弱AI
  - DOMAIN-SUFFIX,generativelanguage.googleapis.com,🌿 弱AI
  - DOMAIN-SUFFIX,ai.google.dev,🌿 弱AI
  - DOMAIN-SUFFIX,perplexity.ai,🌿 弱AI
  - DOMAIN-SUFFIX,poe.com,🌿 弱AI
  - DOMAIN-SUFFIX,huggingface.co,🌿 弱AI
  - DOMAIN-SUFFIX,replicate.com,🌿 弱AI
  - DOMAIN-SUFFIX,openrouter.ai,🌿 弱AI
  - DOMAIN-SUFFIX,cursor.com,🌿 弱AI
  - DOMAIN-SUFFIX,cursor.sh,🌿 弱AI
  - DOMAIN-SUFFIX,windsurf.com,🌿 弱AI
  - DOMAIN-SUFFIX,codeium.com,🌿 弱AI

  - DOMAIN-SUFFIX,youtube.com,📺 YouTube
  - DOMAIN-SUFFIX,youtu.be,📺 YouTube
  - DOMAIN-SUFFIX,ytimg.com,📺 YouTube
  - DOMAIN-SUFFIX,googlevideo.com,📺 YouTube
  - DOMAIN-SUFFIX,youtubei.googleapis.com,📺 YouTube
  - DOMAIN-SUFFIX,ggpht.com,📺 YouTube

  - DOMAIN,github.com,🔧 Dev/API
  - DOMAIN,api.github.com,🔧 Dev/API
  - DOMAIN,raw.githubusercontent.com,🔧 Dev/API
  - DOMAIN-SUFFIX,github.com,🔧 Dev/API
  - DOMAIN-SUFFIX,githubusercontent.com,🔧 Dev/API
  - DOMAIN-SUFFIX,githubassets.com,🔧 Dev/API
  - DOMAIN-SUFFIX,githubcopilot.com,🔧 Dev/API
  - DOMAIN-SUFFIX,ghcr.io,🔧 Dev/API
  - DOMAIN-SUFFIX,npmjs.org,🔧 Dev/API
  - DOMAIN-SUFFIX,npmjs.com,🔧 Dev/API
  - DOMAIN-SUFFIX,pypi.org,🔧 Dev/API
  - DOMAIN-SUFFIX,pythonhosted.org,🔧 Dev/API
  - DOMAIN-SUFFIX,docker.com,🔧 Dev/API
  - DOMAIN-SUFFIX,docker.io,🔧 Dev/API
  - DOMAIN-SUFFIX,registry-1.docker.io,🔧 Dev/API

  - DOMAIN,dash.cloudflare.com,☁️ Cloudflare
  - DOMAIN-SUFFIX,cloudflare.dev,☁️ Cloudflare
  - DOMAIN-SUFFIX,pages.dev,☁️ Cloudflare
  - DOMAIN-SUFFIX,workers.dev,☁️ Cloudflare
  - DOMAIN-SUFFIX,cdnjs.cloudflare.com,☁️ Cloudflare
EOF
} > "$MIXIN"

uci set nikki.mixin.mixin_file_content='1'
uci commit nikki
/etc/init.d/nikki restart
```

## Nikki Dashboard

Nikki API/dashboard listens on 9090 with secret from:

```sh
uci get nikki.mixin.api_secret
```

Allow upstream management access to 9090:

```sh
if ! uci show firewall | grep -q "Allow-Upstream-Nikki-Dashboard"; then
  idx=$(uci add firewall rule)
  uci set firewall.$idx.name='Allow-Upstream-Nikki-Dashboard'
  uci set firewall.$idx.src='wan'
  uci set firewall.$idx.src_ip='192.168.1.0/24'
  uci set firewall.$idx.proto='tcp'
  uci set firewall.$idx.dest_port='9090'
  uci set firewall.$idx.target='ACCEPT'
  uci commit firewall
fi
/etc/init.d/firewall reload || /etc/init.d/firewall restart
```

Open:

```text
http://192.168.1.15:9090/ui/?host=192.168.1.15&hostname=192.168.1.15&port=9090&secret=<secret>
```

Example from this deployment:

```text
secret=869104
```

## Nikki Verification

```sh
/etc/init.d/nikki status
/etc/init.d/openclash status 2>/dev/null || true
netstat -lntup | grep -E '7890|7891|7892|1053|9090'
/usr/bin/mihomo -d /etc/nikki/run -t
```

Confirm no automatic node probing:

```sh
yq -r '."proxy-groups"[] | select(.type == "url-test" or .type == "fallback" or .type == "load-balance") | [.name,.type] | @tsv' /etc/nikki/run/config.yaml
yq -r '."proxy-providers" // {} | to_entries[] | select(.value."health-check".enable == true) | [.key, (.value."health-check".interval // ""), (.value."health-check".url // "")] | @tsv' /etc/nikki/run/config.yaml
```

Both should print nothing.

Test local proxy without consuming batch node checks:

```sh
curl -I -m 12 -x http://127.0.0.1:7890 https://www.google.com
curl -I -m 12 -x http://127.0.0.1:7890 https://chatgpt.com
curl -I -m 12 -x http://127.0.0.1:7890 https://github.com
curl -I -m 12 -x http://127.0.0.1:7890 https://www.youtube.com
```

On downstream PC:

```cmd
ipconfig /flushdns
```

Then open:

```text
https://chatgpt.com
https://github.com
https://www.youtube.com
http://192.168.1.1
http://192.168.8.1
```

## Rollback

Stop Nikki and re-enable OpenClash if needed:

```sh
/etc/init.d/nikki stop || true
uci set nikki.config.enabled='0'
uci commit nikki
/etc/init.d/nikki disable || true

/etc/init.d/openclash enable || true
/etc/init.d/openclash restart || true
```

Restore previous Nikki mixin:

```sh
ls -lah /etc/nikki/mixin.yaml.bak-* /etc/nikki/backup-* 2>/dev/null
cp -f /path/to/backup/mixin.yaml /etc/nikki/mixin.yaml
/etc/init.d/nikki restart
```

## Operational Notes

- Do not run Nikki and OpenClash together.
- Do not enable automatic node testing for Cloudflare-backed nodes unless the provider explicitly allows it.
- Prefer manual `select` groups for AI, YouTube, Dev/API, and FINAL.
- Keep `192.168.0.0/16`, `10.0.0.0/8`, and `172.16.0.0/12` direct.
- Keep IPv6 disabled unless there is a specific tested reason to enable it.
- Keep R2S `router_proxy=0` and `lan_proxy=1` for this topology. R2S itself stays direct; downstream LAN is proxied.
- V2rayN on Windows is only a client. For R2S gateway mode, use Clash/Mihomo YAML, or convert V2rayN links to Clash/Mihomo YAML before importing.
