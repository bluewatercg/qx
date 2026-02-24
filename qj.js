// ============================================================
// 自定义直连域名列表（这些域名强制走直连）
// ============================================================
const customDirectDomains = [
  "fnos.net",             // 飞牛私有云
  "yg.qjjg.net",          // 业务系统
  "syngentachina.com",    // 先正达
  "qjjg.net",
  "tagweb.vip",
  "276686433.xyz",
  "local",
  "localhost",
];

// ============================================================
// 强制走「AI开发」节点的域名 - 核心 AI 服务
// ============================================================
const aiForcedDomains = [
  "opencode.ai",
  "claude.ai",
  "anthropic.com",
  "openai.com",
  "chat.openai.com",
  "api.openai.com",
  "platform.openai.com",
  "auth0.openai.com",
  "gemini.google.com",
  "aistudio.google.com",
  "poe.com",
  "perplexity.ai",
  "you.com",
  "grok.x.ai",
  "x.ai",
  "deepseek.com",
  "deepseek.ai",
  "mistral.ai",
  "together.ai",
  "fireworks.ai",
  "lepton.ai",
  "api.nvidia.com",

  // Google Antigravity IDE 相关
  "antigravity-unleash.goog",
  "antigravity.google",
  "antigravity.google.com",
  "developers.google.com",
  "codelabs.developers.google.com",
  "google.dev",
];

// ============================================================
// AI 相关的基础设施、CDN、依赖域名（也建议走 AI 节点）
// ============================================================
const aiInfraDomains = [
  "gstatic.com",
  "google.com",
  "googleapis.com",
  "googletagmanager.com",
  "fonts.googleapis.com",
  "ajax.googleapis.com",
  "apis.google.com",
  "www.gstatic.com",
  "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com",
  "unpkg.com",
  "fastly.net",
  "cloudflareinsights.com",
  "anthropicusercontent.com",
  "oaiusercontent.com",
  "githubusercontent.com",
  "context7.com",
];

// ============================================================
// 走「⚙️ 节点选择」的域名（办公、生产力、常用工具、Microsoft 365 等）
// ============================================================
const generalProxyDomains = [
  // Notion 相关
  "notion.so",
  "notion.site",
  "notion-static.com",
  "notion.com",
  "www.notion.so",
  "msgstore.www.notion.so",

  // Microsoft 365 / Office / OneDrive / Teams 相关
  "microsoft.com",
  "office.com",
  "office365.com",
  "microsoftonline.com",
  "login.microsoftonline.com",
  "live.com",
  "onedrive.live.com",
  "onedrive.com",
  "officeapps.live.com",
  "teams.microsoft.com",
  "teams.live.com",
  "outlook.office.com",
  "outlook.live.com",
  "graph.microsoft.com",
  "aadcdn.microsoftonline-p.com",
  "msauth.net",
  "msftauth.net",
  "msftidentity.net",
  "msidentity.com",
  "msftconnecttest.com",
  "officeclient.microsoft.com",
  "googleusercontent.com",
  "registry.npmmirror.com",
  "github.com",
  "fauxid.com",
];

// ============================================================
// DNS 配置
// ============================================================
const dnsConfig = {
  "enable": true,
  "ipv6": false,
  "enhanced-mode": "fake-ip",
  "fake-ip-range": "198.18.0.1/16",
  "fake-ip-filter": [
    "+.lan",
    "+.local",
    "localhost.ptlogin2.qq.com",
    ...customDirectDomains.flatMap(d => [`+.${d}`, d])
  ],
  "default-nameserver": ["223.5.5.5", "119.29.29.29"],
  "nameserver": ["223.5.5.5", "119.29.29.29", "8.8.8.8", "1.1.1.1"],
  "proxy-server-nameserver": ["223.5.5.5", "119.29.29.29"],
  "nameserver-policy": {
    "geosite:cn,private": ["223.5.5.5", "119.29.29.29"],
    ...Object.fromEntries(
      customDirectDomains.map(d => [`+.${d},${d}`, ["223.5.5.5", "119.29.29.29"]])
    )
  },
  "respect-rules": true
};

// ============================================================
// 规则集定义（使用 jsDelivr 加速）
// ============================================================
const ruleProviders = {
  "reject": {
    "type": "http",
    "behavior": "domain",
    "format": "mrs",
    "url": "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/category-ads-all.mrs",
    "path": "./ruleset/reject.mrs",
    "interval": 86400
  },
  "direct": {
    "type": "http",
    "behavior": "domain",
    "format": "mrs",
    "url": "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/cn.mrs",
    "path": "./ruleset/direct.mrs",
    "interval": 86400
  }
};

// ============================================================
// 进程识别分类
// ============================================================
const processCategory = {
  ai: ["cherrystudio.exe", "zed.exe", "windsurf.exe", "claude.exe", "opencode.exe", "Notion.exe", "opencode-cli.exe"],
  proxy: ["telegram.exe", "chrome.exe", "msedge.exe", "firefox.exe"],
  direct: ["wechat.exe", "WeChatAppEx.exe", "qq.exe", "wecom.exe", "everything.exe"]
};

// ============================================================
// 节点筛选函数（严格排除香港节点）
// ============================================================
function filterAiNodes(proxies) {
  const excludePatterns = [
    /hk/i,
    /hongkong/i,
    /香港/i,
    /hk-node/i,
    /hong-kong/i,
  ];

  return proxies
    .filter(proxy => {
      const name = proxy.name.toLowerCase();

      // 排除香港相關
      if (excludePatterns.some(pattern => pattern.test(name))) {
        return false;
      }

      // 排除中國大陸和台灣
      if (/(cn|china|中國|tw|taiwan|台灣)/i.test(name)) {
        return false;
      }

      return true;
    })
    .map(p => p.name);
}

// ============================================================
// 主函数
// ============================================================
function main(config) {
  const aiNodes = filterAiNodes(config.proxies || []);

  config["proxy-groups"] = [
    {
      "name": "⚙️ 节点选择",
      "type": "select",
      "proxies": ["♻️ 延迟选优", "💸 AI开发", "DIRECT"]
    },
    {
      "name": "♻️ 延迟选优",
      "type": "url-test",
      "url": "https://www.gstatic.com/generate_204",
      "interval": 300,
      "tolerance": 100,
      "include-all": true
    },
    {
      "name": "💸 AI开发",
      "type": "url-test",
      "proxies": aiNodes.length > 0 ? aiNodes : ["♻️ 延迟选优"],
      "url": "https://www.gstatic.com/generate_204",
      "interval": 300,
      "tolerance": 120
    },
    {
      "name": "🔗 全局直连",
      "type": "select",
      "proxies": ["DIRECT", "♻️ 延迟选优"]
    },
    {
      "name": "🥰 广告过滤",
      "type": "select",
      "proxies": ["REJECT", "DIRECT"]
    },
    {
      "name": "🐟 漏网之鱼",
      "type": "select",
      "proxies": ["⚙️ 节点选择", "🔗 全局直连", "DIRECT"]
    }
  ];

  // 生成规则
  const directRules = customDirectDomains.map(d => `DOMAIN-SUFFIX,${d},🔗 全局直连,no-resolve`);

  const aiForcedRules = aiForcedDomains.map(d => `DOMAIN-SUFFIX,${d},💸 AI开发,no-resolve`);

  const aiInfraRules = aiInfraDomains.map(d => `DOMAIN-SUFFIX,${d},💸 AI开发,no-resolve`);

  const generalProxyRules = generalProxyDomains.map(d => `DOMAIN-SUFFIX,${d},⚙️ 节点选择,no-resolve`);

  config["rules"] = [
    // 最高优先级：核心 AI 服务 + Antigravity IDE
    ...aiForcedRules,

    // 补充：Antigravity IDE 关键词兜底
    "DOMAIN-KEYWORD,antigravity,💸 AI开发,no-resolve",

    // AI 基础设施和依赖
    ...aiInfraRules,

    // 保留一些关键词匹配
    "DOMAIN-KEYWORD,claude,💸 AI开发,no-resolve",
    "DOMAIN-KEYWORD,openai,💸 AI开发,no-resolve",
    "DOMAIN-KEYWORD,anthropic,💸 AI开发,no-resolve",

    // 办公、生产力、Microsoft 365、Teams 等
    ...generalProxyRules,

    // Telegram 相关
    "DOMAIN-KEYWORD,telegram,⚙️ 节点选择,no-resolve",
    "IP-CIDR,91.108.4.0/22,⚙️ 节点选择,no-resolve",
    "IP-CIDR,149.154.160.0/20,⚙️ 节点选择,no-resolve",

    // 自定义直连域名
    ...directRules,

    // 规则集
    "RULE-SET,reject,🥰 广告过滤",
    "RULE-SET,direct,🔗 全局直连",

    // 局域网 & 中国大陆
    "GEOIP,LAN,🔗 全局直连,no-resolve",
    "GEOIP,CN,🔗 全局直连,no-resolve",

    // 进程分流
    ...processCategory.ai.map(p => `PROCESS-NAME,${p},💸 AI开发`),
    ...processCategory.proxy.map(p => `PROCESS-NAME,${p},⚙️ 节点选择`),
    ...processCategory.direct.map(p => `PROCESS-NAME,${p},🔗 全局直连`),

    // 兜底
    "MATCH,🐟 漏网之鱼"
  ];

  config["dns"] = dnsConfig;
  config["rule-providers"] = ruleProviders;

  // 强制开启 UDP
  if (config.proxies) {
    config.proxies.forEach(p => { p.udp = true; });
  }

  return config;
}
