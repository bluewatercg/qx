// ============================================================
// 1. 基础开关 & 节点筛选
// ============================================================
const enableUrlTest = false; 

function filterAiNodes(proxies) {
  const good = /us|usa|america|美国|jp|japan|日本|sg|singapore|新加坡|CF|🇩🇪|🇺🇸|🇸🇬|🇯🇵|🇰🇷/i;
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
  ai: ["cherrystudio.exe", "zed.exe", "windsurf.exe", "claude.exe", "opencode.exe", "Notion.exe", "google.exe"],
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
  {
    "name": "⚙️ 节点选择",
    "type": "select",
    "proxies": ["♻️ 延迟选优", "🤖 Gemini", "🪄 Copilot", "🔬 其他AI", "DIRECT"]
  },
  {
    "name": "♻️ 延迟选优",
    "type": enableUrlTest ? "url-test" : "select",
    "include-all": true
  },
  {
    "name": "🤖 Gemini",           // Gemini 专用组
    "type": enableUrlTest ? "url-test" : "select",
    "proxies": aiNodes.length > 0 ? aiNodes : ["♻️ 延迟选优"]
  },
  {
    "name": "🪄 Copilot",          // Copilot 专用组
    "type": enableUrlTest ? "url-test" : "select",
    "proxies": aiNodes.length > 0 ? aiNodes : ["♻️ 延迟选优"]
  },
  {
    "name": "🔬 其他AI",           // Claude、DeepSeek、Opencode 等
    "type": enableUrlTest ? "url-test" : "select",
    "proxies": aiNodes.length > 0 ? aiNodes : ["♻️ 延迟选优"]
  },
  {
    "name": "🔗 全局直连",
    "type": "select",
    "proxies": ["DIRECT", "♻️ 延迟选优"]
  },
  {
    "name": "🐟 漏网之鱼",
    "type": "select",
    "proxies": ["⚙️ 节点选择", "🔗 全局直连", "DIRECT"]
  }
];

  config["rules"] = [
  // 1. 内网 + 进程直连（保持最高优先级）
  "IP-CIDR,192.168.0.0/16,🔗 全局直连,no-resolve",
  ...customDirectDomains.map(d => `DOMAIN-SUFFIX,${d},🔗 全局直连,no-resolve`),
  ...processCategory.direct.map(p => `PROCESS-NAME,${p},🔗 全局直连`),
  ...processCategory.ai.map(p => `PROCESS-NAME,${p},🔬 其他AI`),

  // 2. 具体 AI 服务分流（关键修改）
  "DOMAIN-SUFFIX,gemini.google.com,🤖 Gemini,no-resolve",
  "DOMAIN-SUFFIX,aistudio.google.com,🤖 Gemini,no-resolve",
  "DOMAIN-KEYWORD,gemini,🤖 Gemini,no-resolve",

  "DOMAIN-SUFFIX,copilot.microsoft.com,🪄 Copilot,no-resolve",
  "DOMAIN-SUFFIX,edge.microsoft.com,🪄 Copilot,no-resolve",
  "DOMAIN-KEYWORD,copilot,🪄 Copilot,no-resolve",

  // 其他 AI 服务走通用组
  "RULE-SET,ai_all,🔬 其他AI",
  "DOMAIN-SUFFIX,claude.ai,🔬 其他AI,no-resolve",
  "DOMAIN-SUFFIX,anthropic.com,🔬 其他AI,no-resolve",
  "DOMAIN-SUFFIX,opencode.ai,🔬 其他AI,no-resolve",
  "DOMAIN-SUFFIX,deepseek.com,🔬 其他AI,no-resolve",

  // 3. 其余规则保持原来顺序
  "RULE-SET,google_domain,🤖 Gemini",
  "RULE-SET,telegram_domain,⚙️ 节点选择",
  "RULE-SET,cn_domain,🔗 全局直连",
  "RULE-SET,cn_ip,🔗 全局直连",
  "GEOIP,CN,🔗 全局直连,no-resolve",
  "MATCH,🐟 漏网之鱼"
];

  config["dns"] = dnsConfig;
  config["rule-providers"] = ruleProviders;
  if (config.proxies) { config.proxies.forEach(p => { p.udp = true; }); }

  return config;
}
