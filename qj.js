// ============================================================
// ✅ Clash Meta · V10 纯手动稳定版（AI 自动 + 手动双模式）
//    每个 AI 都有：
//    1) 自动组（url-test）
//    2) 正式使用组（select，可选“自动组”或任意具体节点）
// ============================================================

const useFakeIP = true;
const FINAL_FALLBACK = false;

// ============================================================
// 1. 自定义白名单 & 进程规则
// ============================================================
const customDirectDomains = [
  "ddns.qjjg.net","qjjg.net","qjjg.ink","fnos.net",
  "yg.qjjg.net","syngentachina.com","local","localhost",
  "aliyun.com","aliyuncs.com","aventura.net.cn","eastmoney.com",

  // 企业微信 / 微信
  "localhost.work.weixin.qq.com",
  "work.weixin.qq.com",
  "weixin.qq.com",
  "wx.qq.com",
  "wechat.com",
  "weixin.com",
  "wxwork.qq.com"
];

const aiManualDomains = [
  "opencode.ai","antigravity-unleash.goog","antigravity.google"
];

const processCategory = {
  ai: ["cherrystudio.exe","zed.exe","windsurf.exe","claude.exe","opencode.exe","Notion.exe"],
  direct: ["wechat.exe","clouddesktop-qml.exe","WeChatAppEx.exe","qq.exe","everything.exe","WXWork.exe"]
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
function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function uniq(arr) {
  return [...new Set(safeArray(arr).filter(Boolean))];
}

const badReg = /(hk|hongkong|hong.?kong|cn|china|中国|香港)/i;
const usReg  = /(us|usa|america|美国|洛杉矶|纽约|硅谷|los.?angeles|new.?york|silicon|🇺🇸)/i;
const deReg  = /(de|germany|德国|法兰克福|frankfurt|berlin|柏林|🇩🇪)/i;
const jpReg  = /(jp|japan|日本|东京|大阪|osaka|tokyo|🇯🇵)/i;
const sgReg  = /(sg|singapore|新加坡|狮城|🇸🇬)/i;
const twReg  = /(tw|taiwan|台湾|🇹🇼)/i;

function pickNodes(proxies, goodReg, denyReg) {
  return safeArray(proxies)
    .filter(p =>
      p &&
      typeof p.name === "string" &&
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

const AICopilot = {
  domains: [
    "copilot.microsoft.com","api.copilot.microsoft.com",
    "sydney.bing.com","edgeservices.bing.com","www.bingapis.com",
    "designer.microsoft.com","edge.microsoft.com",
    "outlook.cloud.microsoft","cloud.microsoft",
    "outlook.office.com","outlook.office365.com","outlook.live.com",
    "substrate.office.com",
    "microsoft.com","microsoftonline.com","microsoftonline-p.net",
    "msauth.net","msauthimages.net","msftauth.net","msftauthimages.net",
    "msftidentity.com","msidentity.com","phonefactor.net",
    "office.com","office.net","office365.com","onmicrosoft.com",
    "outlook.com","outlookmobile.com",
    "onedrive.com","onenote.com","onenote.net",
    "sharepoint.com","sharepointonline.com","svc.ms",
    "teams.microsoft.com","skype.com","lync.com",
    "azure.com","azure.net","azureedge.net","azurewebsites.net",
    "cloudapp.net","trafficmanager.net","graph.microsoft.com",
    "static.microsoft","onecdn.static.microsoft",
    "res.public.onecdn.static.microsoft",
    "officecdn.microsoft.com","cdn.office.net","res.cdn.office.net",
    "aspnetcdn.com","msecnd.net","msedge.net",
    "msocdn.com","gfx.ms","akadns.net",
    "windows.com","windows.net","windowsazure.com","windowsupdate.com",
    "wns.windows.com",
    "live.com","live.net","hotmail.com","msn.com",
    "bing.com","bingapis.com","aka.ms",
    "visualstudio.com","aadrm.com","msft.net","xboxlive.com"
  ],
  probe: "https://api.copilot.microsoft.com/"
};

const AIGemini = {
  domains: [
    "gemini.google.com","aistudio.google.com",
    "ai.google.dev","generativelanguage.googleapis.com",
    "googleapis.com","gstatic.com"
  ],
  probe: "https://generativelanguage.googleapis.com/"
};

const AIGrok = {
  domains: [
    "grok.com","grok.x.com","api.x.com",
    "x.com","twitter.com",
    "twimg.com","abs.twimg.com","pbs.twimg.com",
    "video.twimg.com","ton.twimg.com","img.twimg.com",
    "t.co","cards.twitter.com"
  ],
  probe: "https://api.x.com/"
};

const AIClaude = {
  domains: [
    "claude.ai","anthropic.com",
    "api.anthropic.com","statsig.anthropic.com"
  ],
  probe: "https://api.anthropic.com/"
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
  ],
  probe: "https://api.github.com/rate_limit"
};

// ============================================================
// DNS
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

    "localhost.work.weixin.qq.com",
    "+.work.weixin.qq.com",
    "+.weixin.qq.com",
    "+.wx.qq.com",
    "+.wechat.com",
    "+.weixin.com",
    "+.wxwork.qq.com",

    ...windowsConnectTest.flatMap(d => [d, `+.${d}`]),

    // Microsoft / Copilot
    "+.copilot.microsoft.com",
    "+.api.copilot.microsoft.com",
    "+.sydney.bing.com",
    "+.microsoft.com",
    "+.static.microsoft",
    "+.onecdn.static.microsoft",
    "+.res.public.onecdn.static.microsoft",
    "+.cloud.microsoft",
    "+.officecdn.microsoft.com",
    "+.cdn.office.net",
    "+.msauth.net",
    "+.msauthimages.net",
    "+.msftauth.net",
    "+.msftauthimages.net",
    "+.office.com",
    "+.office.net",
    "+.live.com",
    "+.windows.net",
    "+.azure.com",
    "+.azureedge.net",
    "+.msedge.net",
    "+.akadns.net",
    "+.msocdn.com",

    // Claude
    "+.anthropic.com",
    "+.api.anthropic.com",
    "+.statsig.anthropic.com",

    // Gemini
    "+.googleapis.com",
    "+.generativelanguage.googleapis.com",
    "+.gemini.google.com",
    "+.google.com",
    "+.gstatic.com",

    // GitHub
    "+.github.com",
    "+.githubassets.com",
    "+.githubusercontent.com",

    // Notion
    "notion.so","+.notion.so","msgstore.www.notion.so",
    "+.notion.site","+.notion-static.com",

    // Apple
    "+.apple.com","+.icloud.com",

    // X / Twitter
    "+.twimg.com","+.t.co",
    "x.com","+.x.com",
    "twitter.com","+.twitter.com",

    // Telegram
    ...Chat.domains.flatMap(d => [d, `+.${d}`])
  ] : [],
  "default-nameserver": ["223.5.5.5","119.29.29.29"],
  "nameserver": [
    "https://doh.pub/dns-query",
    "https://dns.alidns.com/dns-query"
  ],
  "proxy-server-nameserver": ["223.5.5.5","119.29.29.29"],
  "nameserver-policy": {
    "geosite:category-ai-!cn": [
      "https://dns.google/dns-query",
      "https://cloudflare-dns.com/dns-query"
    ],
    "geosite:cn": ["223.5.5.5","119.29.29.29"],
    "geosite:private": ["223.5.5.5","119.29.29.29"],
    ...Object.fromEntries(
      windowsConnectTest.map(d => [d, ["223.5.5.5","119.29.29.29"]])
    )
  },
  "respect-rules": true,
  "fallback": [],
  "query-timeout": 3000
};

// ============================================================
// Rule Providers
// ============================================================
const ruleProviders = {
  fakeip_filter: {
    type: "http",
    behavior: "domain",
    format: "mrs",
    url: "https://raw.githubusercontent.com/wwqgtxx/clash-rules/release/fakeip-filter.mrs",
    path: "./ruleset/fakeip_filter.mrs",
    interval: 86400
  },
  ai_all: {
    type: "http",
    behavior: "domain",
    format: "mrs",
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs",
    path: "./ruleset/ai_all.mrs",
    interval: 86400
  },
  cn_domain: {
    type: "http",
    behavior: "domain",
    format: "mrs",
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs",
    path: "./ruleset/cn_domain.mrs",
    interval: 86400
  },
  cn_ip: {
    type: "http",
    behavior: "ipcidr",
    format: "mrs",
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs",
    path: "./ruleset/cn_ip.mrs",
    interval: 86400
  },
  google_domain: {
    type: "http",
    behavior: "domain",
    format: "mrs",
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs",
    path: "./ruleset/google_domain.mrs",
    interval: 86400
  },
  telegram_domain: {
    type: "http",
    behavior: "domain",
    format: "mrs",
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs",
    path: "./ruleset/telegram_domain.mrs",
    interval: 86400
  }
};

// ============================================================
// 主函数（纯同步，FLClash 兼容）
// ============================================================
function main(config) {
  const proxies = safeArray(config.proxies);
  const allNodeNames = uniq(proxies.map(p => p && p.name).filter(Boolean));

  const jpNodes = pickNodes(proxies, jpReg, badReg);
  const sgNodes = pickNodes(proxies, sgReg, badReg);
  const twNodes = pickNodes(proxies, twReg, null); // ✅ TW 允许参与测试

  const videoNodes = uniq([...jpNodes, ...sgNodes, ...twNodes]).filter(n => !usReg.test(n) && !deReg.test(n));
  const videoSafe  = videoNodes.length ? [...videoNodes, "DIRECT"] : ["DIRECT"];
  const chatSafe   = videoNodes.length ? [...videoNodes, "DIRECT"] : ["DIRECT"];

  const gen   = (arr, grp) => arr.map(d  => `DOMAIN-SUFFIX,${d},${grp},no-resolve`);
  const genIP = (arr, grp) => arr.map(ip => `IP-CIDR,${ip},${grp},no-resolve`);

  const copilotSelect = uniq(["🪄 Copilot-自动", ...allNodeNames, "DIRECT"]);
  const claudeSelect  = uniq(["🧠 Claude-自动",  ...allNodeNames, "DIRECT"]);
  const geminiSelect  = uniq(["🤖 Gemini-自动",  ...allNodeNames, "DIRECT"]);
  const grokSelect    = uniq(["🗨️ Grok-自动",    ...allNodeNames, "DIRECT"]);
  const apiaiSelect   = uniq(["🔧 API-AI-自动",  ...allNodeNames, "DIRECT"]);
  const otherAiSelect = uniq(["🔬 其他AI-自动",  ...allNodeNames, "DIRECT"]);

  if (FINAL_FALLBACK) {
    config["proxy-groups"] = [
      { name:"♻️ 主选优",   type:"select", "include-all":true },
      { name:"🔗 全局直连", type:"select", proxies:["DIRECT","♻️ 主选优"] },
      { name:"🐟 漏网之鱼", type:"select", proxies:["♻️ 主选优","DIRECT"] },

      // 自动组
      { name:"🪄 Copilot-自动", type:"url-test", "include-all":true, url:AICopilot.probe, interval:600, timeout:5000, tolerance:150, lazy:true },
      { name:"🧠 Claude-自动",  type:"url-test", "include-all":true, url:AIClaude.probe,  interval:600, timeout:5000, tolerance:150, lazy:true },
      { name:"🤖 Gemini-自动",  type:"url-test", "include-all":true, url:AIGemini.probe,  interval:600, timeout:5000, tolerance:150, lazy:true },
      { name:"🗨️ Grok-自动",    type:"url-test", "include-all":true, url:AIGrok.probe,    interval:600, timeout:5000, tolerance:150, lazy:true },
      { name:"🔧 API-AI-自动",  type:"url-test", "include-all":true, url:APIAI.probe,     interval:600, timeout:5000, tolerance:150, lazy:true },
      { name:"🔬 其他AI-自动",  type:"url-test", "include-all":true, url:"https://www.perplexity.ai/", interval:600, timeout:5000, tolerance:150, lazy:true },

      // 正式使用组（可选自动组，也可手动选任何具体节点）
      { name:"🪄 Copilot", type:"select", proxies:copilotSelect },
      { name:"🧠 Claude",  type:"select", proxies:claudeSelect },
      { name:"🤖 Gemini",  type:"select", proxies:geminiSelect },
      { name:"🗨️ Grok",    type:"select", proxies:grokSelect },
      { name:"🔬 其他AI",  type:"select", proxies:otherAiSelect },
      { name:"🔧 API-AI",  type:"select", proxies:apiaiSelect }
    ];

    config.rules = [
      "IP-CIDR,192.168.0.0/16,🔗 全局直连,no-resolve",
      "IP-CIDR,172.16.0.0/12,🔗 全局直连,no-resolve",
      "IP-CIDR,10.0.0.0/8,🔗 全局直连,no-resolve",

      ...customDirectDomains.flatMap(d => [
        `DOMAIN,${d},🔗 全局直连,no-resolve`,
        `DOMAIN-SUFFIX,${d},🔗 全局直连,no-resolve`
      ]),

      ...processCategory.direct.map(p => `PROCESS-NAME,${p},🔗 全局直连`),
      ...processCategory.ai.map(p    => `PROCESS-NAME,${p},🔧 API-AI`),

      ...gen(AICopilot.domains, "🪄 Copilot"),
      ...gen(AIClaude.domains,  "🧠 Claude"),
      ...gen(AIGemini.domains,  "🤖 Gemini"),
      ...gen(AIGrok.domains,    "🗨️ Grok"),
      ...gen(AIother.domains,   "🔬 其他AI"),
      ...gen(APIAI.domains,     "🔧 API-AI"),

      "RULE-SET,cn_domain,🔗 全局直连",
      "RULE-SET,cn_ip,🔗 全局直连",
      "GEOIP,CN,🔗 全局直连,no-resolve",
      "MATCH,🐟 漏网之鱼"
    ];

    config.dns = dnsConfig;
    config["rule-providers"] = ruleProviders;
    proxies.forEach(p => { p.udp = true; });
    return config;
  }

  // ============================================================
  // 正常模式：AI 自动 + 手动双模式
  // ============================================================
  config["proxy-groups"] = [
    {
      name: "⚙️ 节点选择",
      type: "select",
      proxies: ["♻️ 主选优","💸 AI开发","🔗 全局直连","DIRECT"]
    },

    { name:"♻️ 主选优",   type:"select", "include-all":true },
    { name:"🔗 全局直连", type:"select", proxies:["DIRECT","♻️ 主选优"] },
    { name:"💸 AI开发",   type:"select", "include-all":true },

    { name:"🎬 视频",    type:"select", proxies:videoSafe },
    { name:"💬 聊天/TG", type:"select", proxies:chatSafe },

    // AI 自动组（url-test）
    { name:"🪄 Copilot-自动", type:"url-test", "include-all":true, url:AICopilot.probe, interval:600, timeout:5000, tolerance:150, lazy:true },
    { name:"🧠 Claude-自动",  type:"url-test", "include-all":true, url:AIClaude.probe,  interval:600, timeout:5000, tolerance:150, lazy:true },
    { name:"🤖 Gemini-自动",  type:"url-test", "include-all":true, url:AIGemini.probe,  interval:600, timeout:5000, tolerance:150, lazy:true },
    { name:"🗨️ Grok-自动",    type:"url-test", "include-all":true, url:AIGrok.probe,    interval:600, timeout:5000, tolerance:150, lazy:true },
    { name:"🔧 API-AI-自动",  type:"url-test", "include-all":true, url:APIAI.probe,     interval:600, timeout:5000, tolerance:150, lazy:true },
    { name:"🔬 其他AI-自动",  type:"url-test", "include-all":true, url:"https://www.perplexity.ai/", interval:600, timeout:5000, tolerance:150, lazy:true },

    // AI 正式使用组（可选自动组，也可手动选任意具体节点）
    { name:"🪄 Copilot", type:"select", proxies:copilotSelect },
    { name:"🧠 Claude",  type:"select", proxies:claudeSelect },
    { name:"🤖 Gemini",  type:"select", proxies:geminiSelect },
    { name:"🗨️ Grok",    type:"select", proxies:grokSelect },
    { name:"🔬 其他AI",  type:"select", proxies:otherAiSelect },
    { name:"🔧 API-AI",  type:"select", proxies:apiaiSelect },

    { name:"🐟 漏网之鱼", type:"select", proxies:["⚙️ 节点选择","🔗 全局直连","DIRECT"] }
  ];

  config.rules = [
    // 内网
    "IP-CIDR,192.168.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,172.16.0.0/12,🔗 全局直连,no-resolve",
    "IP-CIDR,10.0.0.0/8,🔗 全局直连,no-resolve",

    // Windows / Apple 探测
    ...windowsConnectTest.flatMap(d => [
      `DOMAIN,${d},🔗 全局直连,no-resolve`,
      `DOMAIN-SUFFIX,${d},🔗 全局直连,no-resolve`
    ]),

    // 企业微信 / 微信本地域名
    "DOMAIN,localhost.work.weixin.qq.com,🔗 全局直连,no-resolve",
    "DOMAIN-SUFFIX,work.weixin.qq.com,🔗 全局直连,no-resolve",
    "DOMAIN-SUFFIX,weixin.qq.com,🔗 全局直连,no-resolve",
    "DOMAIN-SUFFIX,wx.qq.com,🔗 全局直连,no-resolve",
    "DOMAIN-SUFFIX,wechat.com,🔗 全局直连,no-resolve",
    "DOMAIN-SUFFIX,weixin.com,🔗 全局直连,no-resolve",
    "DOMAIN-SUFFIX,wxwork.qq.com,🔗 全局直连,no-resolve",

    // 自定义直连
    ...customDirectDomains.flatMap(d => [
      `DOMAIN,${d},🔗 全局直连,no-resolve`,
      `DOMAIN-SUFFIX,${d},🔗 全局直连,no-resolve`
    ]),

    // 进程分流
    ...processCategory.direct.map(p => `PROCESS-NAME,${p},🔗 全局直连`),
    ...processCategory.ai.map(p    => `PROCESS-NAME,${p},💸 AI开发`),

    // 特殊 AI 域名
    ...aiManualDomains.map(d => `DOMAIN-SUFFIX,${d},💸 AI开发,no-resolve`),
    "DOMAIN-KEYWORD,antigravity,💸 AI开发",

    // AI 精细分流（正式只走 select 组）
    ...gen(AICopilot.domains, "🪄 Copilot"),
    ...gen(AIClaude.domains,  "🧠 Claude"),
    ...gen(AIGemini.domains,  "🤖 Gemini"),
    ...gen(AIGrok.domains,    "🗨️ Grok"),
    ...gen(AIother.domains,   "🔬 其他AI"),
    ...gen(APIAI.domains,     "🔧 API-AI"),

    // 视频 / 聊天
    ...gen(Video.domains,  "🎬 视频"),
    ...gen(Chat.domains,   "💬 聊天/TG"),
    ...genIP(Chat.ipcidr,  "💬 聊天/TG"),
    "RULE-SET,telegram_domain,💬 聊天/TG",
    "RULE-SET,google_domain,🤖 Gemini",
    "RULE-SET,ai_all,🔬 其他AI",

    // 国内
    "RULE-SET,cn_domain,🔗 全局直连",
    "RULE-SET,cn_ip,🔗 全局直连",
    "GEOIP,CN,🔗 全局直连,no-resolve",

    "MATCH,🐟 漏网之鱼"
  ];

  config.dns = dnsConfig;
  config["rule-providers"] = ruleProviders;
  proxies.forEach(p => { p.udp = true; });
  return config;
}
