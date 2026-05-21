// ============================================================
// ✅ Clash Meta · V11.1 纯手动稳定省流版
//   - AI 细分组保留 + 微软国际化独立组 + Cloudflare 显式代理
//   - 关闭所有自动测速，纯手动 select
//   - 默认开启 smux（CF Worker 节点若不支持可关）
//   - redir-host DNS 模式 + WS 保活，提升连接复用
// ============================================================
const useFakeIP = false;
const FINAL_FALLBACK = false;
const ENABLE_SMUX = true;

// ============================================================
// 1. 自定义白名单 & 进程规则
// ============================================================
const customDirectDomains = [
  "ddns.qjjg.net","qjjg.net","qjjg.ink","fnos.net",
  "yg.qjjg.net","syngentachina.com","local","localhost",
  "aliyun.com","aliyuncs.com","aventura.net.cn","eastmoney.com",
  // 企业微信 / 微信
  "localhost.work.weixin.qq.com",
  "work.weixin.qq.com","weixin.qq.com","wx.qq.com",
  "wechat.com","weixin.com","wxwork.qq.com"
];

const aiManualDomains = [
  "opencode.ai","antigravity-unleash.goog","antigravity.google"
];

const processCategory = {
  ai: ["cherrystudio.exe","zed.exe","windsurf.exe","claude.exe","opencode.exe","Antigravity IDE.exe"],
  direct: ["wechat.exe","clouddesktop-qml.exe","WeChatAppEx.exe","qq.exe","everything.exe","WXWork.exe","Notion.exe"]
};

const windowsConnectTest = [
  "msftconnecttest.com","www.msftconnecttest.com",
  "ipv4.msftconnecttest.com","ipv6.msftconnecttest.com",
  "msftncsi.com","www.msftncsi.com",
  "connecttest.microsoft.com",
  "captive.apple.com","airport.us.apple.com"
];

// ============================================================
// 工具函数
// ============================================================
function safeArray(arr) { return Array.isArray(arr) ? arr : []; }
function uniq(arr) { return [...new Set(safeArray(arr).filter(Boolean))]; }

const badReg = /(hk|hongkong|hong.?kong|cn|china|中国|香港)/i;
const usReg = /(us|usa|america|美国|洛杉矶|纽约|硅谷|los.?angeles|new.?york|silicon|🇺🇸)/i;
const deReg = /(de|germany|德国|法兰克福|frankfurt|berlin|柏林|🇩🇪)/i;
const jpReg = /(jp|japan|日本|东京|大阪|osaka|tokyo|🇯🇵)/i;
const sgReg = /(sg|singapore|新加坡|狮城|🇸🇬)/i;
const twReg = /(tw|taiwan|台湾|🇹🇼)/i;

function pickNodes(proxies, goodReg, denyReg) {
  return safeArray(proxies)
    .filter(p =>
      p && typeof p.name === "string" &&
      goodReg.test(p.name) &&
      (denyReg ? !denyReg.test(p.name) : true)
    )
    .map(p => p.name);
}

// ============================================================
// 域名模块
// ============================================================
const Video = {
  domains: [
    "youtube.com","googlevideo.com","ytimg.com","youtube-nocookie.com",
    "netflix.com","nflxvideo.net","nflximg.net","nflxso.net",
    "disneyplus.com","primevideo.com","hbomax.com","max.com"
  ]
};

const Chat = {
  domains: [
    "telegram.org","t.me","tdesktop.com","telegra.ph",
    "discord.com","discord.gg","discordapp.com","discordapp.net",
    "whatsapp.com","whatsapp.net","signal.org","signal.me"
  ],
  ipcidr: [
    "91.108.0.0/16","91.105.192.0/23",
    "91.108.4.0/22","91.108.8.0/22","91.108.12.0/22",
    "91.108.16.0/22","91.108.20.0/22","91.108.56.0/22",
    "149.154.160.0/20","149.154.164.0/22",
    "149.154.168.0/22","149.154.172.0/22"
  ]
};

// ⭐ V11.1: Cloudflare 自家服务（明确代理，但避开 Worker 节点本身的域名）
//    注意：不要把 cloudflare.com 整个加进来，否则可能影响节点 SNI 解析
const Cloudflare = {
  domains: [
    "cloudflare.dev",
    "cloudflareinsights.com",
    "cloudflarestream.com",
    "challenges.cloudflare.com",
    "cdnjs.cloudflare.com",
    "dash.cloudflare.com",
    "support.cloudflare.com",
    "developers.cloudflare.com",
    "blog.cloudflare.com",
    "community.cloudflare.com",
    "one.one.one.one",
    "1.1.1.1"
  ]
};

// ⭐ Copilot 精简版：只保留真·入口
const AICopilot = {
  domains: [
    "copilot.microsoft.com","api.copilot.microsoft.com",
    "sydney.bing.com","edgeservices.bing.com",
    "designer.microsoft.com","substrate.office.com",
    "bing.com","www.bing.com","bingapis.com","www.bingapis.com"
  ]
};

// ⭐ 微软国际化独立组（强制走海外节点，确保国际版）
//   注：精确/长域名前置，避免被父域 microsoft.com 通配吞掉
const MSGlobal = {
  domains: [
    // 精确/长域名前置
    "outlook.cloud.microsoft","cloud.microsoft",
    "edge.microsoft.com",
    "static.microsoft","onecdn.static.microsoft","res.public.onecdn.static.microsoft",
    "officecdn.microsoft.com","cdn.office.net","res.cdn.office.net",
    "graph.microsoft.com","teams.microsoft.com",
    // 账号 / 认证
    "microsoftonline.com","microsoftonline-p.net",
    "msauth.net","msauthimages.net","msftauth.net","msftauthimages.net",
    "msftidentity.com","msidentity.com","phonefactor.net",
    // Office / M365
    "office.com","office.net","office365.com","onmicrosoft.com",
    "outlook.com","outlook.office.com","outlook.office365.com",
    "outlook.live.com","outlookmobile.com",
    "onedrive.com","onenote.com","onenote.net",
    "sharepoint.com","sharepointonline.com","svc.ms",
    "skype.com","lync.com",
    // 系统 / 账户
    "live.com","live.net","hotmail.com","msn.com",
    "windows.com","windows.net","windowsupdate.com","wns.windows.com",
    "xboxlive.com","aka.ms",
    // Azure / CDN
    "azure.com","azure.net","azureedge.net","azurewebsites.net",
    "cloudapp.net","trafficmanager.net",
    "aspnetcdn.com","msecnd.net","msedge.net","msocdn.com",
    "gfx.ms","akadns.net",
    // 开发者
    "visualstudio.com","aadrm.com","msft.net",
    // ⚠️ microsoft.com 放最后兜底（前面的精确域名优先匹配）
    "microsoft.com"
  ]
};

const AIGemini = {
  domains: [
    "gemini.google.com","aistudio.google.com",
    "ai.google.dev","generativelanguage.googleapis.com",
    "googleapis.com","gstatic.com"
  ]
};

const AIGrok = {
  domains: [
    "grok.com","grok.x.com","api.x.com",
    "x.com","twitter.com",
    "twimg.com","abs.twimg.com","pbs.twimg.com",
    "video.twimg.com","ton.twimg.com","img.twimg.com",
    "t.co","cards.twitter.com"
  ]
};

const AIClaude = {
  domains: [
    "claude.ai","anthropic.com",
    "api.anthropic.com","statsig.anthropic.com"
  ]
};

const AIother = {
  domains: [
    "perplexity.ai","api.perplexity.ai",
    "poe.com","you.com","mistral.ai",
    "together.ai","fireworks.ai","lepton.ai"
  ]
};

const APIAI = {
  domains: [
    "github.com","api.github.com",
    "raw.githubusercontent.com","githubassets.com",
    "githubusercontent.com","user-images.githubusercontent.com",
    "copilot-proxy.githubusercontent.com","vscode-auth.github.com",
    "objects.githubusercontent.com","deepseek.com"
  ]
};

// ============================================================
// DNS（V11.1：redir-host 模式 + respect-rules）
// ============================================================
const dnsConfig = {
  enable: true,
  listen: useFakeIP ? "127.0.0.1:53" : undefined,
  ipv6: false,
  "enhanced-mode": useFakeIP ? "fake-ip" : "redir-host",
  "fake-ip-range": "198.18.0.1/16",
  "fake-ip-filter": useFakeIP ? [
    "rule-set:fakeip_filter",
    "+.lan","+_tcp.local","+_udp.local","+_services._dns-sd._udp.local",
    "localhost","+.localhost",
    ...customDirectDomains.flatMap(d => [`+.${d}`, d]),
    ...windowsConnectTest.flatMap(d => [d, `+.${d}`])
  ] : [],
  "default-nameserver": ["223.5.5.5","119.29.29.29"],
  "nameserver": ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"],
  "proxy-server-nameserver": ["223.5.5.5","119.29.29.29"],
  "nameserver-policy": {
    "geosite:category-ai-!cn": ["https://dns.google/dns-query", "https://cloudflare-dns.com/dns-query"],
    "geosite:cn": ["223.5.5.5","119.29.29.29"],
    "geosite:private": ["223.5.5.5","119.29.29.29"]
  },
  "respect-rules": true,
  "query-timeout": 3000
};

// ============================================================
// Rule Providers
// ============================================================
const ruleProviders = {
  fakeip_filter: { type: "http", behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/wwqgtxx/clash-rules/release/fakeip-filter.mrs", path: "./ruleset/fakeip_filter.mrs", interval: 86400 },
  ai_all: { type: "http", behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs", path: "./ruleset/ai_all.mrs", interval: 86400 },
  cn_domain: { type: "http", behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs", path: "./ruleset/cn_domain.mrs", interval: 86400 },
  cn_ip: { type: "http", behavior: "ipcidr", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs", path: "./ruleset/cn_ip.mrs", interval: 86400 },
  google_domain: { type: "http", behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs", path: "./ruleset/google_domain.mrs", interval: 86400 },
  telegram_domain: { type: "http", behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs", path: "./ruleset/telegram_domain.mrs", interval: 86400 }
};

// ============================================================
// 主函数
// ============================================================
function main(config) {
  const proxies = safeArray(config.proxies);
  const allNodeNames = uniq(proxies.map(p => p && p.name).filter(Boolean));

  const jpNodes = pickNodes(proxies, jpReg, badReg);
  const sgNodes = pickNodes(proxies, sgReg, badReg);
  const twNodes = pickNodes(proxies, twReg, null);
  const videoNodes = uniq([...jpNodes, ...sgNodes, ...twNodes]).filter(n => !usReg.test(n) && !deReg.test(n));

  const videoSafe = videoNodes.length ? [...videoNodes, "DIRECT"] : ["DIRECT"];
  const chatSafe  = videoNodes.length ? [...videoNodes, "DIRECT"] : ["DIRECT"];

  // ==================== Proxy Groups（全 select，无自动测速）====================
  config["proxy-groups"] = [
    {
      name: "⚙️ 节点选择",
      type: "select",
      proxies: ["♻️ 主选优", "💸 AI开发", "🪟 微软国际", "☁️ Cloudflare", "🎬 视频", "💬 聊天/TG", "🔗 全局直连", "DIRECT"]
    },
    { name: "♻️ 主选优", type: "select", proxies: allNodeNames },
    { name: "🔗 全局直连", type: "select", proxies: ["DIRECT", "♻️ 主选优"] },

    // 微软国际化主组（手动指美国节点）
    { name: "🪟 微软国际", type: "select", proxies: ["♻️ 主选优", ...allNodeNames, "DIRECT"] },

    // ⭐ V11.1 新增：Cloudflare 服务组
    { name: "☁️ Cloudflare", type: "select", proxies: ["♻️ 主选优", "🪟 微软国际", ...allNodeNames, "DIRECT"] },

    // AI 开发主组
    { name: "💸 AI开发", type: "select", proxies: ["♻️ 主选优", ...allNodeNames, "DIRECT"] },

    { name: "🎬 视频", type: "select", proxies: videoSafe },
    { name: "💬 聊天/TG", type: "select", proxies: chatSafe },

    // 各 AI 精细组
    { name: "🪄 Copilot",  type: "select", proxies: ["💸 AI开发", "🪟 微软国际", "♻️ 主选优", ...allNodeNames, "DIRECT"] },
    { name: "🧠 Claude",   type: "select", proxies: ["💸 AI开发", "♻️ 主选优", ...allNodeNames, "DIRECT"] },
    { name: "🤖 Gemini",   type: "select", proxies: ["💸 AI开发", "♻️ 主选优", ...allNodeNames, "DIRECT"] },
    { name: "🗨️ Grok",    type: "select", proxies: ["💸 AI开发", "♻️ 主选优", ...allNodeNames, "DIRECT"] },
    { name: "🔧 API-AI",   type: "select", proxies: ["💸 AI开发", "♻️ 主选优", ...allNodeNames, "DIRECT"] },
    { name: "🔬 其他AI",   type: "select", proxies: ["💸 AI开发", "♻️ 主选优", ...allNodeNames, "DIRECT"] },

    // ⭐ V11.1：兜底明确归宿（优先走微软国际组的节点）
    { name: "🐟 漏网之鱼", type: "select", proxies: ["🪟 微软国际", "♻️ 主选优", "⚙️ 节点选择", "🔗 全局直连", "DIRECT"] }
  ];

  // ==================== Rules ====================
  config.rules = [
    // ===== 内网直连 =====
    "IP-CIDR,192.168.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,172.16.0.0/12,🔗 全局直连,no-resolve",
    "IP-CIDR,10.0.0.0/8,🔗 全局直连,no-resolve",

    // ===== 系统连通性测试 =====
    ...windowsConnectTest.flatMap(d => [
      `DOMAIN,${d},🔗 全局直连,no-resolve`,
      `DOMAIN-SUFFIX,${d},🔗 全局直连,no-resolve`
    ]),

    // ===== 企业微信 / 微信 =====
    "DOMAIN,localhost.work.weixin.qq.com,🔗 全局直连,no-resolve",
    "DOMAIN-SUFFIX,work.weixin.qq.com,🔗 全局直连,no-resolve",
    "DOMAIN-SUFFIX,weixin.qq.com,🔗 全局直连,no-resolve",
    "DOMAIN-SUFFIX,wx.qq.com,🔗 全局直连,no-resolve",
    "DOMAIN-SUFFIX,wechat.com,🔗 全局直连,no-resolve",
    "DOMAIN-SUFFIX,weixin.com,🔗 全局直连,no-resolve",
    "DOMAIN-SUFFIX,wxwork.qq.com,🔗 全局直连,no-resolve",

    // ===== 自定义直连白名单 =====
    ...customDirectDomains.flatMap(d => [
      `DOMAIN,${d},🔗 全局直连,no-resolve`,
      `DOMAIN-SUFFIX,${d},🔗 全局直连,no-resolve`
    ]),

    // ===== 进程分流 =====
    ...processCategory.direct.map(p => `PROCESS-NAME,${p},🔗 全局直连`),
    ...processCategory.ai.map(p => `PROCESS-NAME,${p},💸 AI开发`),

    // ===== 手动指定 AI 域名 =====
    ...aiManualDomains.map(d => `DOMAIN-SUFFIX,${d},💸 AI开发,no-resolve`),
    "DOMAIN-KEYWORD,antigravity,💸 AI开发",

    // ===== Copilot（必须代理）=====
    ...AICopilot.domains.map(d => `DOMAIN-SUFFIX,${d},🪄 Copilot,no-resolve`),

    // ===== Claude / Gemini / Grok / 其它 AI / API-AI =====
    ...AIClaude.domains.map(d => `DOMAIN-SUFFIX,${d},🧠 Claude,no-resolve`),
    ...AIGemini.domains.map(d => `DOMAIN-SUFFIX,${d},🤖 Gemini,no-resolve`),
    ...AIGrok.domains.map(d => `DOMAIN-SUFFIX,${d},🗨️ Grok,no-resolve`),
    ...AIother.domains.map(d => `DOMAIN-SUFFIX,${d},🔬 其他AI,no-resolve`),
    ...APIAI.domains.map(d => `DOMAIN-SUFFIX,${d},🔧 API-AI,no-resolve`),

    // ===== 微软全家桶（独立 🪟 微软国际 组）=====
    ...MSGlobal.domains.map(d => `DOMAIN-SUFFIX,${d},🪟 微软国际,no-resolve`),

    // ===== ⭐ V11.1 新增：Cloudflare 自家服务 =====
    ...Cloudflare.domains.map(d => `DOMAIN-SUFFIX,${d},☁️ Cloudflare,no-resolve`),

    // ===== 视频 & 聊天 =====
    ...Video.domains.map(d => `DOMAIN-SUFFIX,${d},🎬 视频,no-resolve`),
    ...Chat.domains.map(d => `DOMAIN-SUFFIX,${d},💬 聊天/TG,no-resolve`),
    ...Chat.ipcidr.map(ip => `IP-CIDR,${ip},💬 聊天/TG,no-resolve`),

    // ===== Rule-Sets =====
    "RULE-SET,telegram_domain,💬 聊天/TG",
    "RULE-SET,google_domain,🤖 Gemini",
    "RULE-SET,ai_all,🔬 其他AI",

    // ===== 国内分流 =====
    "RULE-SET,cn_domain,🔗 全局直连",
    "RULE-SET,cn_ip,🔗 全局直连",
    "GEOIP,CN,🔗 全局直连,no-resolve",

    // ===== 兜底 =====
    "MATCH,🐟 漏网之鱼"
  ];

  config.dns = dnsConfig;
  config["rule-providers"] = ruleProviders;

  // ⭐ WS 长连接保活（减少 CF Worker 重连）
  config["keep-alive-interval"] = 30;

  // ⭐ 给所有节点注入 smux（不支持的节点会自动降级）
  proxies.forEach(p => {
    p.udp = true;
    if (ENABLE_SMUX && (p.type === "vless" || p.type === "vmess" || p.type === "trojan" || p.type === "ss")) {
      p.smux = {
        enabled: true,
        protocol: "smux",
        "max-connections": 4,
        "min-streams": 4,
        padding: false
      };
    }
  });

  return config;
}
