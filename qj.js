// ============================================================
// ✅ Clash Meta · V7 融合增强版（FLClash 同步兼容版）
// 修复：移除 async/await，main() 改为纯同步
// ============================================================

const useFakeIP         = true;
const enableMainUrlTest = false;
const enableAiUrlTest   = true;

const FINAL_FALLBACK = false;

// ============================================================
// 1. 自定义白名单 & 进程规则
// ============================================================
const customDirectDomains = [
  "ddns.qjjg.net","qjjg.net","qjjg.ink","fnos.net",
  "yg.qjjg.net","syngentachina.com","local","localhost",
  "aliyun.com","aliyuncs.com","aventura.net.cn","eastmoney.com"
];

const aiManualDomains = [
  "opencode.ai","antigravity-unleash.goog","antigravity.google"
];

const processCategory = {
  ai:     ["cherrystudio.exe","zed.exe","windsurf.exe","claude.exe","opencode.exe","Notion.exe"],
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
// 工具函数 & 节点正则
// ============================================================
function safeArray(arr){ return Array.isArray(arr) ? arr : []; }

const badReg = /(hk|hongkong|hong.?kong|tw|taiwan|cn|china|中国|香港|台湾)/i;
const usReg  = /(us|usa|america|美国|洛杉矶|纽约|硅谷|los.?angeles|new.?york|silicon|🇺🇸)/i;
const deReg  = /(de|germany|德国|法兰克福|frankfurt|berlin|柏林|🇩🇪)/i;
const jpReg  = /(jp|japan|日本|东京|大阪|osaka|tokyo|🇯🇵)/i;
const sgReg  = /(sg|singapore|新加坡|狮城|🇸🇬)/i;

function pickNodes(proxies, goodReg, badReg){
  return safeArray(proxies)
    .filter(p =>
      p &&
      typeof p.name === "string" &&
      goodReg.test(p.name) &&
      (badReg ? !badReg.test(p.name) : true)
    )
    .map(p => p.name);
}

function filterAiNodes(proxies){
  const goodReg = /(us|usa|america|美国|de|germany|德国|jp|japan|日本|sg|singapore|新加坡|CF|🇺🇸|🇩🇪|🇯🇵|🇸🇬|🇰🇷)/i;
  return pickNodes(proxies, goodReg, badReg);
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
  probe: "https://api.copilot.microsoft.com"
};

const AIGemini = {
  domains: [
    "gemini.google.com","aistudio.google.com",
    "ai.google.dev","generativelanguage.googleapis.com",
    "googleapis.com","gstatic.com"
  ],
  probe: "https://generativelanguage.googleapis.com"
};

const AIGrok = {
  domains: [
    "grok.com","grok.x.com","api.x.com",
    "x.com","twitter.com","abs.twimg.com"
  ],
  probe: "https://api.x.com"
};

const AIClaude = {
  domains: [
    "claude.ai","anthropic.com",
    "api.anthropic.com","statsig.anthropic.com"
  ],
  probe: "https://api.anthropic.com"
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
    ...customDirectDomains.flatMap(d => [`+.${d}`, d]),
    ...windowsConnectTest.flatMap(d => [d, `+.${d}`]),
    "+.microsoft.com","+.static.microsoft",
    "+.onecdn.static.microsoft","+.res.public.onecdn.static.microsoft",
    "+.cloud.microsoft",
    "+.officecdn.microsoft.com","+.cdn.office.net",
    "+.msauth.net","+.msauthimages.net",
    "+.msftauth.net","+.msftauthimages.net",
    "+.office.com","+.office.net","+.live.com",
    "+.windows.net","+.azure.com","+.azureedge.net",
    "+.msedge.net","+.akadns.net","+.msocdn.com",
    "+.google.com","+.googleapis.com","+.gstatic.com",
    "+.github.com","+.githubassets.com","+.githubusercontent.com",
    "notion.so","+.notion.so","msgstore.www.notion.so",
    "+.notion.site","+.notion-static.com",
    "+.apple.com","+.icloud.com",
    ...Chat.domains.flatMap(d => [d, `+.${d}`]),
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
    "geosite:cn":      ["223.5.5.5","119.29.29.29"],
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
    type:"http", behavior:"domain", format:"mrs",
    url:"https://raw.githubusercontent.com/wwqgtxx/clash-rules/release/fakeip-filter.mrs",
    path:"./ruleset/fakeip_filter.mrs", interval:86400
  },
  ai_all: {
    type:"http", behavior:"domain", format:"mrs",
    url:"https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs",
    path:"./ruleset/ai_all.mrs", interval:86400
  },
  cn_domain: {
    type:"http", behavior:"domain", format:"mrs",
    url:"https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs",
    path:"./ruleset/cn_domain.mrs", interval:86400
  },
  cn_ip: {
    type:"http", behavior:"ipcidr", format:"mrs",
    url:"https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs",
    path:"./ruleset/cn_ip.mrs", interval:86400
  },
  google_domain: {
    type:"http", behavior:"domain", format:"mrs",
    url:"https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs",
    path:"./ruleset/google_domain.mrs", interval:86400
  },
  telegram_domain: {
    type:"http", behavior:"domain", format:"mrs",
    url:"https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs",
    path:"./ruleset/telegram_domain.mrs", interval:86400
  }
};

// ============================================================
// ✅ 主函数（纯同步，FLClash 兼容）
// ============================================================
function main(config){
  const proxies = safeArray(config.proxies);

  const usNodes = pickNodes(proxies, usReg, badReg);
  const deNodes = pickNodes(proxies, deReg, badReg);
  const jpNodes = pickNodes(proxies, jpReg, badReg);
  const sgNodes = pickNodes(proxies, sgReg, badReg);
  const aiNodes = filterAiNodes(proxies);
  const aiSafe  = aiNodes.length ? aiNodes : ["DIRECT"];
  const usSafe  = usNodes.length ? usNodes : aiSafe;
  const deSafe  = deNodes.length ? deNodes : aiSafe;
  const jpSafe  = jpNodes.length ? jpNodes : aiSafe;

  // 节点分配（纯正则，无网络请求）
  const copilotNodes = usSafe;
  const geminiNodes  = [...usSafe, ...jpSafe];
  const grokNodes    = usSafe;
  const claudeNodes  = [...usSafe, ...deSafe];
  const apiNodes     = [...usSafe, ...deSafe];

  const videoNodes = [...jpNodes, ...sgNodes]
    .filter(n => !usReg.test(n) && !deReg.test(n));
  const videoSafe  = videoNodes.length ? [...videoNodes,"DIRECT"] : ["DIRECT"];
  const chatSafe   = videoNodes.length ? [...videoNodes,"DIRECT"] : ["DIRECT"];

  const gen   = (arr, grp) => arr.map(d  => `DOMAIN-SUFFIX,${d},${grp},no-resolve`);
  const genIP = (arr, grp) => arr.map(ip => `IP-CIDR,${ip},${grp},no-resolve`);

  // ============================================================
  // 🆘 FINAL_FALLBACK 极简模式
  // ============================================================
  if (FINAL_FALLBACK){
    config["proxy-groups"] = [
      { name:"♻️ 主选优",   type:"select", "include-all":true },
      { name:"🔗 全局直连", type:"select", proxies:["DIRECT","♻️ 主选优"] },
      { name:"🐟 漏网之鱼", type:"select", proxies:["♻️ 主选优","DIRECT"] }
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
      ...processCategory.ai.map(p    => `PROCESS-NAME,${p},♻️ 主选优`),
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
  // 正常模式：完整精细分流
  // ============================================================
  config["proxy-groups"] = [
    {
      name: "⚙️ 节点选择",
      type: "select",
      proxies: ["♻️ 主选优","💸 AI开发","🔗 全局直连","DIRECT"]
    },
    { name:"♻️ 主选优",   type:enableMainUrlTest?"url-test":"select", "include-all":true },
    { name:"🔗 全局直连", type:"select", proxies:["DIRECT","♻️ 主选优"] },
    { name:"💸 AI开发",   type:enableAiUrlTest?"url-test":"select", proxies:aiSafe },

    { name:"🎬 视频",    type:"select", proxies:videoSafe },
    { name:"💬 聊天/TG", type:"select", proxies:chatSafe  },

    { name:"🪄 Copilot-主", type:"url-test", url:AICopilot.probe, interval:120, timeout:3500, tolerance:100, proxies:copilotNodes },
    { name:"🪄 Copilot",    type:"fallback",  url:AICopilot.probe, interval:120, timeout:3500, proxies:["🪄 Copilot-主","♻️ 主选优"] },

    { name:"🤖 Gemini-主",  type:"url-test", url:AIGemini.probe,  interval:120, timeout:3500, tolerance:100, proxies:geminiNodes },
    { name:"🤖 Gemini",     type:"fallback",  url:AIGemini.probe,  interval:120, timeout:3500, proxies:["🤖 Gemini-主","♻️ 主选优"] },

    { name:"🗨️ Grok",   type:enableAiUrlTest?"url-test":"select", url:AIGrok.probe,   interval:120, timeout:3500, tolerance:100, proxies:grokNodes  },
    { name:"🧠 Claude",  type:enableAiUrlTest?"url-test":"select", url:AIClaude.probe, interval:120, timeout:3500, tolerance:100, proxies:claudeNodes },
    { name:"🔬 其他AI",  type:enableAiUrlTest?"url-test":"select", proxies:aiSafe },

    { name:"🔧 API-AI-主", type:"url-test", url:APIAI.probe, interval:120, timeout:3500, tolerance:100, proxies:apiNodes },
    { name:"🔧 API-AI",    type:"fallback",  url:APIAI.probe, interval:120, timeout:3500, proxies:["🔧 API-AI-主","💸 AI开发"] },

    { name:"🐟 漏网之鱼", type:"select", proxies:["⚙️ 节点选择","🔗 全局直连","DIRECT"] }
  ];

  config.rules = [
    "IP-CIDR,192.168.0.0/16,🔗 全局直连,no-resolve",
    "IP-CIDR,172.16.0.0/12,🔗 全局直连,no-resolve",
    "IP-CIDR,10.0.0.0/8,🔗 全局直连,no-resolve",
    ...windowsConnectTest.flatMap(d => [
      `DOMAIN,${d},🔗 全局直连,no-resolve`,
      `DOMAIN-SUFFIX,${d},🔗 全局直连,no-resolve`
    ]),
    ...customDirectDomains.flatMap(d => [
      `DOMAIN,${d},🔗 全局直连,no-resolve`,
      `DOMAIN-SUFFIX,${d},🔗 全局直连,no-resolve`
    ]),
    ...processCategory.direct.map(p => `PROCESS-NAME,${p},🔗 全局直连`),
    ...processCategory.ai.map(p    => `PROCESS-NAME,${p},💸 AI开发`),
    "AND,((NETWORK,udp),(DST-PORT,443)),REJECT",
    ...aiManualDomains.map(d => `DOMAIN-SUFFIX,${d},💸 AI开发,no-resolve`),
    "DOMAIN-KEYWORD,antigravity,💸 AI开发",
    ...gen(AICopilot.domains, "🪄 Copilot"),
    ...gen(AIGemini.domains,  "🤖 Gemini"),
    ...gen(AIGrok.domains,    "🗨️ Grok"),
    ...gen(AIClaude.domains,  "🧠 Claude"),
    ...gen(AIother.domains,   "🔬 其他AI"),
    ...gen(APIAI.domains,     "🔧 API-AI"),
    ...gen(Video.domains,     "🎬 视频"),
    ...gen(Chat.domains,      "💬 聊天/TG"),
    ...genIP(Chat.ipcidr,     "💬 聊天/TG"),
    "RULE-SET,telegram_domain,💬 聊天/TG",
    "RULE-SET,google_domain,🤖 Gemini",
    "RULE-SET,ai_all,🔬 其他AI",
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
