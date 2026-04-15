// ============================================================
// 1. 基础开关 & 节点筛选
// ============================================================
const enableUrlTest = false; 

function filterAiNodes(proxies) {
  const good = /us|usa|america|美国|jp|japan|日本|sg|singapore|新加坡/i|CF/i;
  const bad = /hk|hongkong|香港|cn|china|中国|tw|taiwan/i;
  return proxies.filter(p => !bad.test(p.name) && good.test(p.name)).map(p => p.name);
}

// ============================================================
// 2. 自定义白名单 (手动覆盖区)
// ============================================================
const customDirectDomains = [
  "ddns.qjjg.net", "qjjg.net", "qjjg.ink", "fnos.net", 
  "yg.qjjg.net", "syngentachina.com", "local", "localhost",
  "aliyun.com", "aliyuncs.com", "aventura.net.cn", "eastmoney.com"
];

// 特殊 AI 域名 (即使社区库没更新，这里也能强制指定)
const aiManualDomains = [
  "opencode.ai", "antigravity-unleash.goog", "antigravity.google"
];

const processCategory = {
  ai: ["cherrystudio.exe", "zed.exe", "windsurf.exe", "claude.exe", "opencode.exe", "Notion.exe"],
  direct: ["wechat.exe", "clouddesktop-qml.exe", "WeChatAppEx.exe", "qq.exe", "everything.exe", "WXWork.exe"]
};

// ============================================================
// 3. DNS 配置 (融合了 Fake-IP 过滤库)
// ============================================================
const dnsConfig = {
  "enable": true,
  "ipv6": false,
  "enhanced-mode": "fake-ip",
  "fake-ip-range": "198.18.0.1/16",
  "fake-ip-filter": [
    "rule-set:fakeip_filter", // 👈 缝合点：使用社区维护的穿透库
    "+.lan", "+.local", ...customDirectDomains.flatMap(d => [`+.${d}`, d])
  ],
  "default-nameserver": ["223.5.5.5", "119.29.29.29"],
  "nameserver": ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"],
  "proxy-server-nameserver": ["223.5.5.5", "119.29.29.29"],
  "nameserver-policy": {
    "geosite:category-ai-!cn": ["https://dns.google/dns-query", "8.8.8.8"], // 👈 AI 专用 DNS
    "geosite:cn": ["223.5.5.5", "119.29.29.29"]
  },
  "respect-rules": true,
  "query-timeout": 3000
};

// ============================================================
// 4. 缝合规则集 (MRS 格式 - 极致性能)
// ============================================================
const ruleProviders = {
  "fakeip_filter": { "type": "http", "behavior": "domain", "format": "mrs", "url": "https://raw.githubusercontent.com/wwqgtxx/clash-rules/release/fakeip-filter.mrs", "path": "./ruleset/fakeip_filter.mrs", "interval": 86400 },
  "ai_all": { "type": "http", "behavior": "domain", "format": "mrs", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs", "path": "./ruleset/ai_all.mrs", "interval": 86400 },
  "cn_domain": { "type": "http", "behavior": "domain", "format": "mrs", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs", "path": "./ruleset/cn_domain.mrs", "interval": 86400 },
  "cn_ip": { "type": "http", "behavior": "ipcidr", "format": "mrs", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs", "path": "./ruleset/cn_ip.mrs", "interval": 86400 },
  "google_domain": { "type": "http", "behavior": "domain", "format": "mrs", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs", "path": "./ruleset/google_domain.mrs", "interval": 86400 },
  "telegram_domain": { "type": "http", "behavior": "domain", "format": "mrs", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs", "path": "./ruleset/telegram_domain.mrs", "interval": 86400 }
};

// ============================================================
// 5. 主函数
// ============================================================
function main(config) {
  const aiNodes = filterAiNodes(config.proxies || []);

  config["proxy-groups"] = [
    { "name": "⚙️ 节点选择", "type": "select", "proxies": ["♻️ 延迟选优", "💸 AI开发", "DIRECT"], "include-all": true },
    { "name": "♻️ 延迟选优", "type": enableUrlTest ? "url-test" : "select", "include-all": true, "url": "http://www.google.com/generate_204", "interval": 300 },
    { "name": "💸 AI开发", "type": enableUrlTest ? "url-test" : "select", "proxies": aiNodes.length > 0 ? aiNodes : ["♻️ 延迟选优"], "url": "https://www.google.com/generate_204", "interval": 300 },
    { "name": "🔗 全局直连", "type": "select", "proxies": ["DIRECT", "♻️ 延迟选优"] },
    { "name": "🐟 漏网之鱼", "type": "select", "proxies": ["⚙️ 节点选择", "🔗 全局直连", "DIRECT"] }
  ];

  config["rules"] = [
    // --- 第一层：绝对直连 (VPN & 内网) ---
    "IP-CIDR,192.168.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,172.16.0.0/12,🔗 全局直连,no-resolve",
    "IP-CIDR,10.0.0.0/8,🔗 全局直连,no-resolve",
    ...customDirectDomains.map(d => `DOMAIN-SUFFIX,${d},🔗 全局直连,no-resolve`),

    // --- 第二层：进程识别 ---
    ...processCategory.direct.map(p => `PROCESS-NAME,${p},🔗 全局直连`),
    ...processCategory.ai.map(p => `PROCESS-NAME,${p},💸 AI开发`),

    // --- 第三层：自动化 AI 分流 (缝合点) ---
    ...aiManualDomains.map(d => `DOMAIN-SUFFIX,${d},💸 AI开发,no-resolve`),
    "RULE-SET,ai_all,💸 AI开发",
    "RULE-SET,google_domain,💸 AI开发",
    "DOMAIN-KEYWORD,antigravity,💸 AI开发",

    // --- 第四层：其他常用代理 ---
    "RULE-SET,telegram_domain,⚙️ 节点选择",

    // --- 第五层：自动化国内直连 (缝合点) ---
    "RULE-SET,cn_domain,🔗 全局直连",
    "RULE-SET,cn_ip,🔗 全局直连",
    "GEOIP,CN,🔗 全局直连,no-resolve",

    // --- 第六层：兜底 ---
    "MATCH,🐟 漏网之鱼"
  ];

  config["dns"] = dnsConfig;
  config["rule-providers"] = ruleProviders;
  if (config.proxies) { config.proxies.forEach(p => { p.udp = true; }); }

  return config;
}
