# R2S Zero-To-Deployed LLM Brief

Give this brief plus `/root/r2s-istoreos-downstream-gateway-nikki-runbook.md` to the next model/operator.

## Mission

Deploy NanoPi R2S/iStoreOS as a two-port downstream gateway behind iKuai:

```text
iKuai / upstream gateway:       192.168.1.1/24
R2S WAN eth0:                   192.168.1.15/24
R2S LAN br-lan/eth1:            192.168.8.1/24
Downstream DHCP:                192.168.8.100-192.168.8.249
Proxy stack:                    Nikki + Mihomo
IPv6:                           disabled
OpenClash:                      disabled when Nikki is used
```

Cable layout after the base network script is applied:

```text
iKuai/upstream switch -> R2S WAN/eth0
R2S LAN/eth1          -> downstream PC or downstream switch
```

## Non-Negotiable Rules

- Do not make iKuai DHCP gateway point to R2S. iKuai stays `192.168.1.1`.
- Add iKuai static route: `192.168.8.0/24 via 192.168.1.15`.
- Keep private networks direct: `192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`.
- Do not run OpenClash and Nikki together.
- Do not enable IPv6.
- Do not enable `url-test`, `fallback`, `load-balance`, or provider health checks.
- Do not run bulk node tests. The nodes may be Cloudflare-backed and connection-limited.
- Use manual `select` groups for AI, YouTube, Dev/API, Cloudflare, and FINAL.

## Required Inputs

Before starting, collect:

```text
R2S current reachable SSH IP:
R2S root password or SSH key:
Target R2S WAN IP:
Upstream gateway IP:
Upstream subnet:
Downstream subnet:
Downstream DHCP range:
Clash/Mihomo subscription YAML or OpenClash profile path:
```

For this deployment, the verified values were:

```text
Temporary SSH IP:               192.168.1.22
Final R2S WAN IP:               192.168.1.15
Upstream gateway:               192.168.1.1
Upstream subnet:                192.168.1.0/24
Downstream LAN IP:              192.168.8.1
Downstream subnet:              192.168.8.0/24
Downstream DHCP:                192.168.8.100-192.168.8.249
Device:                         FriendlyElec NanoPi R2S | Plus
iStoreOS:                       24.10.6 2026041710
Kernel:                         6.6.127
```

## Execute In This Order

1. On iKuai, add static route:

```text
Destination: 192.168.8.0
Netmask:     255.255.255.0
Gateway:     192.168.1.15
Priority:    1
Remark:      R2S
Status:      Enabled
```

2. SSH into R2S temporary IP.

3. Run the base network script from the runbook section `R2S Base Network Script`.

4. Move cables:

```text
upstream switch -> R2S WAN/eth0
downstream PC/switch -> R2S LAN/eth1
```

5. Verify R2S:

```sh
ip -br addr show eth0
ip -br addr show br-lan
ip route
netstat -lnup | grep ':67'
```

Expected:

```text
eth0 has 192.168.1.15/24
br-lan has 192.168.8.1/24
default route via 192.168.1.1
dnsmasq listens on UDP 67
```

6. Verify downstream Windows PC:

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

7. Optional cleanup: remove Docker, file sharing, mobile/device management, ttyd, Samba/NFS/WebDAV packages using the cleanup section in the runbook.

8. Install Nikki:

```sh
wget -O - https://github.com/nikkinikki-org/OpenWrt-nikki/raw/refs/heads/main/feed.sh | ash
opkg install nikki luci-app-nikki luci-i18n-nikki-zh-cn
```

9. Stop OpenClash:

```sh
/etc/init.d/openclash stop || true
/etc/init.d/openclash disable || true
```

10. Put Clash/Mihomo YAML in `/etc/nikki/profiles/<profile-name>.yaml`.

11. Configure Nikki LAN-only transparent proxy using the runbook section `Import Clash/Mihomo YAML Into Nikki`.

12. Apply the runbook section `Nikki AI/YouTube/Dev Mixin`.

13. Allow Dashboard TCP 9090 using the runbook section `Nikki Dashboard`.

14. Verify:

```sh
/etc/init.d/nikki status
/etc/init.d/openclash status 2>/dev/null || true
/usr/bin/mihomo -d /etc/nikki/run -t
yq -r '."proxy-groups"[] | select(.type == "url-test" or .type == "fallback" or .type == "load-balance") | [.name,.type] | @tsv' /etc/nikki/run/config.yaml
yq -r '."proxy-providers" // {} | to_entries[] | select(.value."health-check".enable == true) | [.key, (.value."health-check".interval // ""), (.value."health-check".url // "")] | @tsv' /etc/nikki/run/config.yaml
```

Expected:

```text
Nikki running
OpenClash inactive
Mihomo config test successful
The two yq commands print nothing
```

## Final Business Groups

These groups should all be manual `select` groups with direct node choices:

```text
🤖 AI
🔥 强AI
🌿 弱AI
📺 YouTube
🔧 Dev/API
☁️ Cloudflare
🐟 AI-FINAL
```

## Final Access URLs

```text
R2S from upstream:      http://192.168.1.15
R2S from downstream:    http://192.168.8.1
Nikki Dashboard:        http://192.168.1.15:9090/ui/?host=192.168.1.15&hostname=192.168.1.15&port=9090&secret=<api_secret>
```

Get Dashboard secret:

```sh
uci get nikki.mixin.api_secret
```

## Common Failures

Downstream PC cannot get DHCP:

```sh
uci set dhcp.lan.force='1'
uci commit dhcp
/etc/init.d/dnsmasq restart
netstat -lnup | grep ':67'
```

Upstream cannot reach downstream:

```text
Check iKuai static route: 192.168.8.0/24 via 192.168.1.15.
Check R2S firewall rule: Allow-Upstream-to-Downstream.
Check downstream Windows firewall if ping still fails.
```

Dashboard refused:

```sh
netstat -lntup | grep ':9090'
uci show firewall | grep Allow-Upstream-Nikki-Dashboard
/etc/init.d/nikki status
```

No foreign internet:

```sh
/usr/bin/mihomo -d /etc/nikki/run -t
/etc/init.d/nikki restart
curl -I -m 12 -x http://127.0.0.1:7890 https://www.google.com
```

Do not fix by enabling automatic node testing unless explicitly approved.
