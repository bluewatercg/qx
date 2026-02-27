// ============================================================
// 自定义直连域名列表（这些域名强制走直连）
// ============================================================
const customDirectDomains = [
  "fnos.net",
  "yg.qjjg.net",
  "syngentachina.com",
  "qjjg.net",
  "tagweb.vip",
  "276686433.xyz",
  "local",
  "localhost",
  "aventura.net.cn"
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

  "antigravity-unleash.goog",
  "antigravity.google",
  "antigravity.google.com",
  "developers.google.com",
  "codelabs.developers.google.com",
  "google.dev",
];

// ============================================================
// AI 相关的基础设施、CDN、依赖域名
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
// 走「⚙️ 节点选择」的域名（办公、生产力、Microsoft 365 等）
// ============================================================
const generalProxyDomains = [
  "notion.so",
  "notion.site",
  "notion-static.com",
  "notion.com",
  "www.notion.so",
  "msgstore.www.notion.so",
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
// DNS 配置（全 DoH + 国内优先）
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
    ...customDirectDomains.flatMap(d => [`+.${d}`, d]),
    "+.home.arpa",
    "+.internal",
    "+.corp",
    "time.windows.com",
    "time.nist.gov",
    "time.apple.com",
    "aventura.net.cn",                    // ← 手动加保险
    "+.aventura.net.cn"                   // ← 通配所有子域名
  ],
  "default-nameserver": [
    "https://223.5.5.5/dns-query",
    "https://120.53.53.53/dns-query"
  ],
  "nameserver": [
    "https://dns.alidns.com/dns-query",   // 阿里 DoH 主力
    "https://doh.pub/dns-query",          // 腾讯 DoH 备用
    "https://dns.google/dns-query"        // 国外兜底
  ],
  "proxy-server-nameserver": [
    "https://dns.alidns.com/dns-query",
    "https://doh.pub/dns-query"
  ],
  "nameserver-policy": {
    // 不再依赖 geosite，直接用国内 DoH 作为默认
    // 如果需要国内域名特殊处理，可以手动加 DOMAIN-SUFFIX
  },
  "respect-rules": true,
  "query-timeout": 5000,
  "skip-fallback": true
};

// ============================================================
// 规则集定义（jsDelivr 加速）
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
// 节点筛选函数（只保留美国、日本、新加坡节点）
// ============================================================
const preferredPatterns = /us|usa|america|美国|ny|chicago|los angeles|seattle|sfo|atlanta|jp|japan|日本|tokyo|osaka|nagoya|fukuoka|sapporo|sg|singapore|新加坡/i;

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

      if (excludePatterns.some(pattern => pattern.test(name)) ||
          /(cn|china|中國|tw|taiwan|台灣)/i.test(name)) {
        return false;
      }

      return preferredPatterns.test(name);
    })
    .map(p => p.name);
}

// ============================================================
// 主函数（不依赖 GeoSite / GeoIP）
// ============================================================
function main(config) {
  // 不指定 geosite / geoip，彻底不使用它们
  // config["geosite"] = ...;   // 删除
  // config["geoip"]   = ...;   // 删除

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
      "url": "https://connectivitycheck.gstatic.com/generate_204",
      "interval": 1200,
      "tolerance": 200,
      "include-all": true
    },
    {
      "name": "💸 AI开发",
      "type": "url-test",
      "proxies": aiNodes.length > 0 ? aiNodes : ["♻️ 延迟选优"],
      "url": "https://connectivitycheck.gstatic.com/generate_204",
      "interval": 1200,
      "tolerance": 200
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

  const directRules = customDirectDomains.map(d => `DOMAIN-SUFFIX,${d},🔗 全局直连,no-resolve`);
  const aiForcedRules = aiForcedDomains.map(d => `DOMAIN-SUFFIX,${d},💸 AI开发,no-resolve`);
  const aiInfraRules = aiInfraDomains.map(d => `DOMAIN-SUFFIX,${d},💸 AI开发,no-resolve`);
  const generalProxyRules = generalProxyDomains.map(d => `DOMAIN-SUFFIX,${d},⚙️ 节点选择,no-resolve`);

  config["rules"] = [
    // 最优先：本地局域网 + 常见中国大陆 IP 段（手动覆盖，不依赖 GeoIP）
    "IP-CIDR,192.168.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,172.16.0.0/12,🔗 全局直连,no-resolve",
    "IP-CIDR,10.0.0.0/8,🔗 全局直连,no-resolve",
    "IP-CIDR,169.254.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,100.64.0.0/10,🔗 全局直连,no-resolve",

    // 常见中国大陆运营商 IP 段（手动补充，替代 GEOIP,CN）
    "IP-CIDR,1.0.1.0/24,🔗 全局直连,no-resolve",
    "IP-CIDR,1.1.1.0/24,🔗 全局直连,no-resolve",
    "IP-CIDR,1.12.0.0/14,🔗 全局直连,no-resolve",
    "IP-CIDR,1.45.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,1.56.0.0/13,🔗 全局直连,no-resolve",
    "IP-CIDR,1.68.0.0/14,🔗 全局直连,no-resolve",
    "IP-CIDR,1.80.0.0/13,🔗 全局直连,no-resolve",
    "IP-CIDR,1.88.0.0/14,🔗 全局直连,no-resolve",
    "IP-CIDR,14.0.0.0/21,🔗 全局直连,no-resolve",
    "IP-CIDR,14.16.0.0/12,🔗 全局直连,no-resolve",
    "IP-CIDR,14.102.180.0/22,🔗 全局直连,no-resolve",
    "IP-CIDR,14.103.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,14.130.0.0/15,🔗 全局直连,no-resolve",
    "IP-CIDR,14.134.0.0/15,🔗 全局直连,no-resolve",
    "IP-CIDR,14.144.0.0/12,🔗 全局直连,no-resolve",
    "IP-CIDR,14.192.60.0/22,🔗 全局直连,no-resolve",
    "IP-CIDR,14.192.80.0/20,🔗 全局直连,no-resolve",
    "IP-CIDR,14.196.0.0/15,🔗 全局直连,no-resolve",
    "IP-CIDR,27.8.0.0/13,🔗 全局直连,no-resolve",
    "IP-CIDR,27.16.0.0/12,🔗 全局直连,no-resolve",
    "IP-CIDR,27.36.0.0/14,🔗 全局直连,no-resolve",
    "IP-CIDR,27.40.0.0/13,🔗 全局直连,no-resolve",
    "IP-CIDR,27.50.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,27.54.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,27.98.0.0/15,🔗 全局直连,no-resolve",
    "IP-CIDR,27.106.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,27.115.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,27.124.0.0/14,🔗 全局直连,no-resolve",
    "IP-CIDR,27.128.0.0/10,🔗 全局直连,no-resolve",

    // 核心 AI 服务 + Antigravity IDE
    ...aiForcedRules,

    // Antigravity 关键词兜底
    "DOMAIN-KEYWORD,antigravity,💸 AI开发,no-resolve",

    // AI 基础设施和依赖
    ...aiInfraRules,

    // 关键词匹配增强
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

    // 进程分流
    ...processCategory.ai.map(p => `PROCESS-NAME,${p},💸 AI开发`),
    ...processCategory.proxy.map(p => `PROCESS-NAME,${p},⚙️ 节点选择`),
    ...processCategory.direct.map(p => `PROCESS-NAME,${p},🔗 全局直连`),

    // 兜底
    "MATCH,🐟 漏网之鱼"
  ];

  config["dns"] = dnsConfig;
  config["rule-providers"] = ruleProviders;

  if (config.proxies) {
    config.proxies.forEach(p => { p.udp = true; });
  }

  return config;
}
