// ============================================================
// 【配置中心】你以后只需要改这部分
// ============================================================
const enableUrlTest = false; // true = 自动测速, false = 手动选节点

// 1. 公司/私有直连清单 (解决 VPN 和内网访问)
const customDirectDomains = [
  "ddns.qjjg.net", "qjjg.net", "qjjg.ink", "fnos.net", 
  "yg.qjjg.net", "syngentachina.com", "local", "localhost",
  "aliyun.com", "aliyuncs.com"
];

// 2. 强制走「AI开发」的特权域名 (需要锁定美日节点)
const aiForcedDomains = [
  "opencode.ai", "claude.ai", "anthropic.com", "openai.com", 
  "chatgpt.com", "deepseek.com", "deepseek.ai", "grok.x.ai",
  "gemini.google.com", "aistudio.google.com"
];

// 3. 进程分流清单
const processCategory = {
  ai: ["cherrystudio.exe", "zed.exe", "windsurf.exe", "claude.exe", "opencode.exe", "Notion.exe"],
  proxy: ["telegram.exe"],
  direct: ["wechat.exe", "clouddesktop-qml.exe", "WeChatAppEx.exe", "qq.exe", "everything.exe"]
};

// ============================================================
// 【DNS 逻辑】修复 8.8.8.8 公司报错 & VPN 冲突
// ============================================================
const dnsConfig = {
  "enable": true,
  "ipv6": false,
  "enhanced-mode": "fake-ip",
  "fake-ip-range": "198.18.0.1/16",
  "fake-ip-filter": [
    "+.lan", "+.local", "localhost.ptlogin2.qq.com",
    ...customDirectDomains.flatMap(d => [`+.${d}`, d]),
    "msftconnecttest.com", "msftncsi.com"
  ],
  "default-nameserver": ["223.5.5.5", "119.29.29.29"],
  "nameserver": ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"],
  "proxy-server-nameserver": ["223.5.5.5", "119.29.29.29"], // 确保机场节点域名能解析
  "nameserver-policy": {
    // 只有 AI 域名走国外 DNS，且通过代理，避免公司内网拦截 8.8.8.8
    [aiForcedDomains.join(",")]: ["8.8.8.8", "https://dns.google/dns-query"],
    "geosite:cn": ["223.5.5.5", "119.29.29.29"]
  },
  "respect-rules": true,
  "query-timeout": 3000
};

// ============================================================
// 【规则集】引入远程库，减少手动维护
// ============================================================
const ruleProviders = {
  "reject": { "type": "http", "behavior": "domain", "format": "mrs", "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/category-ads-all.mrs", "path": "./ruleset/reject.mrs", "interval": 86400 },
  "direct": { "type": "http", "behavior": "domain", "format": "mrs", "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/cn.mrs", "path": "./ruleset/direct.mrs", "interval": 86400 },
  "ai_all": { "type": "http", "behavior": "domain", "format": "mrs", "url": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/category-ai-all.mrs", "path": "./ruleset/ai_all.mrs", "interval": 86400 }
};

// ============================================================
// 【主逻辑】
// ============================================================
function filterAiNodes(proxies) {
  const good = /us|usa|america|美国|jp|japan|日本|sg|singapore|新加坡/i;
  const bad = /hk|hongkong|香港|cn|china|中国|tw|taiwan/i;
  return proxies.filter(p => !bad.test(p.name) && good.test(p.name)).map(p => p.name);
}

function main(config) {
  const aiNodes = filterAiNodes(config.proxies || []);

  // 1. 代理组构建
  config["proxy-groups"] = [
    { "name": "⚙️ 节点选择", "type": "select", "proxies": ["♻️ 延迟选优", "💸 AI开发", "DIRECT"], "include-all": true },
    { "name": "♻️ 延迟选优", "type": enableUrlTest ? "url-test" : "select", "include-all": true, "url": "http://www.google.com/generate_204", "interval": 300 },
    { "name": "💸 AI开发", "type": enableUrlTest ? "url-test" : "select", "proxies": aiNodes.length > 0 ? aiNodes : ["♻️ 延迟选优"], "url": "https://www.google.com/generate_204", "interval": 300 },
    { "name": "🔗 全局直连", "type": "select", "proxies": ["DIRECT", "♻️ 延迟选优"] },
    { "name": "🥰 广告过滤", "type": "select", "proxies": ["REJECT", "DIRECT"] },
    { "name": "🐟 漏网之鱼", "type": "select", "proxies": ["⚙️ 节点选择", "🔗 全局直连", "DIRECT"] }
  ];

  // 2. 规则链构建
  config["rules"] = [
    // A. 顶级直连 (内网 IP 和公司域名)
    "IP-CIDR,192.168.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,172.16.0.0/12,🔗 全局直连,no-resolve",
    "IP-CIDR,10.0.0.0/8,🔗 全局直连,no-resolve",
    ...customDirectDomains.map(d => `DOMAIN-SUFFIX,${d},🔗 全局直连,no-resolve`),

    // B. 核心 AI 代理 (no-resolve 解决解析超时)
    ...aiForcedDomains.map(d => `DOMAIN-SUFFIX,${d},💸 AI开发,no-resolve`),
    "RULE-SET,ai_all,💸 AI开发", // 自动涵盖社区维护的 AI 列表

    // C. 进程分流
    ...processCategory.direct.map(p => `PROCESS-NAME,${p},🔗 全局直连`),
    ...processCategory.ai.map(p => `PROCESS-NAME,${p},💸 AI开发`),
    ...processCategory.proxy.map(p => `PROCESS-NAME,${p},⚙️ 节点选择`),

    // D. 基础规则
    "RULE-SET,reject,🥰 广告过滤",
    "RULE-SET,direct,🔗 全局直连",
    "GEOIP,CN,🔗 全局直连,no-resolve",

    // E. 兜底
    "MATCH,🐟 漏网之鱼"
  ];

  config["dns"] = dnsConfig;
  config["rule-providers"] = ruleProviders;
  if (config.proxies) { config.proxies.forEach(p => { p.udp = true; }); }

  return config;
}
