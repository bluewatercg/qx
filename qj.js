// ============================================================
// ✅ Clash Meta · 最终版 v7（含三级兜底方案）
// 兜底层级：https://raw.githubusercontent.com/bluewatercg/qx/refs/heads/main/qj.js
// 1️⃣ 精细规则（AI / 视频 / 聊天各自走专属节点）
// 2️⃣ 主选优兜底（命中但无专属组时走主组）
// 3️⃣ 终极兜底（FINAL_FALLBACK 开关，一键全走主选优）
// ============================================================

const useFakeIP         = true;
const enableMainUrlTest = false;
const enableAiUrlTest   = true;
const IPINFO_TOKEN      = "";

// ============================================================
// 🆘 兜底开关（出问题时把这个改成 true，立刻恢复可用）
// true  = 全部流量走 ♻️ 主选优，忽略所有精细分组
// false = 正常精细分流（默认）
// ============================================================
const FINAL_FALLBACK = false;

// ============================================================
// 工具函数
// ============================================================
function safeArray(arr){ return Array.isArray(arr) ? arr : []; }

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

// ============================================================
// 节点正则
// ============================================================
const badReg = /(hk|hongkong|hong.?kong|tw|taiwan|cn|china|中国|香港|台湾)/i;
const usReg  = /(us|usa|america|美国|洛杉矶|纽约|硅谷|los.?angeles|new.?york|silicon|🇺🇸)/i;
const deReg  = /(de|germany|德国|法兰克福|frankfurt|berlin|柏林|🇩🇪)/i;
const jpReg  = /(jp|japan|日本|东京|大阪|osaka|tokyo|🇯🇵)/i;
const sgReg  = /(sg|singapore|新加坡|狮城|🇸🇬)/i;

function filterAiNodes(proxies){
  const goodReg = /(us|usa|america|美国|de|germany|德国|jp|japan|日本|东京|大阪|sg|singapore|新加坡|🇺🇸|🇩🇪|🇯🇵|🇸🇬|🇰🇷)/i;
  return pickNodes(proxies, goodReg, badReg);
}

// ============================================================
// ipinfo 查询
// ============================================================
async function queryIpInfo(ip){
  try {
    const url = IPINFO_TOKEN
      ? `https://ipinfo.io/${ip}?token=${IPINFO_TOKEN}`
      : `https://ipinfo.io/${ip}/json`;
    const res = await fetch(url, { timeout: 3000 });
    return await res.json();
  } catch(e){ return null; }
}

const ASN_MAP = {
  "AS8075":"copilot","AS8068":"copilot","AS8069":"copilot",
  "AS15169":"gemini","AS396982":"gemini",
  "AS16509":"api","AS14618":"api",
  "AS13335":"web","AS209242":"web",
  "AS32934":"grok","AS63293":"grok",
  "AS31898":"api","AS24940":"video","AS51167":"video",
};
const COUNTRY_MAP = {
  "US":"api","DE":"api","GB":"api","FR":"api","NL":"api",
  "JP":"video","SG":"web","KR":"web",
};
function classifyByIpInfo(info){
  if (!info) return null;
  const org = info.org || "";
  const asnMatch = org.match(/^(AS\d+)/i);
  if (asnMatch){
    const asn = asnMatch[1].toUpperCase();
    if (ASN_MAP[asn]) return ASN_MAP[asn];
  }
  const o = org.toLowerCase();
  if (/microsoft/.test(o))              return "copilot";
  if (/google/.test(o))                 return "gemini";
  if (/amazon|aws/.test(o))             return "api";
  if (/cloudflare/.test(o))             return "web";
  if (/anthropic/.test(o))              return "claude";
  if (/meta |facebook/.test(o))         return "grok";
  if (/oracle/.test(o))                 return "api";
  if (/digitalocean|linode|vultr|hetzner|contabo/.test(o)) return "video";
  return COUNTRY_MAP[(info.country||"").toUpperCase()] || null;
}

// ============================================================
// 域名模块
// ============================================================
const customDirectDomains = [
  "ddns.qjjg.net","qjjg.net","qjjg.ink","fnos.net",
  "aliyun.com","aliyuncs.com","aventura.net.cn","eastmoney.com"
];

const windowsConnectTest = [
  "msftconnecttest.com","www.msftconnecttest.com",
  "ipv4.msftconnecttest.com","ipv6.msftconnecttest.com",
  "msftncsi.com","www.msftncsi.com","ipv6.msftncsi.com",
  "connecttest.microsoft.com",
  "captive.apple.com","airport.us.apple.com"
];

const Video = {
  domains: [
    "youtube.com","googlevideo.com","ytimg.com","youtube-nocookie.com",
    "netflix.com","nflxvideo.net","nflximg.net","nflxso.net",
    "disneyplus.com","disneypluscdn.com",
    "primevideo.com","media-amazon.com",
    "hbomax.com","max.com"
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
    "sydney.bing.com","edgeservices.bing.com",
    "www.bingapis.com","designer.microsoft.com","edge.microsoft.com",
    "outlook.cloud.microsoft","cloud.microsoft",
    "outlook.office.com","outlook.office365.com",
    "substrate.office.com","outlook.live.com",
    "microsoft.com","microsoftonline.com","microsoftonline-p.net",
    "msauth.net","msauthimages.net","msftauth.net","msftauthimages.net",
    "msftidentity.com","msidentity.com","phonefactor.net",
    "office.com","office.net","office365.com","officeppe.net",
    "oaspapps.com","o365weve.com","onmicrosoft.com",
    "outlook.com","outlookmobile.com",
    "onedrive.com","onenote.com","onenote.net",
    "sharepoint.com","sharepointonline.com",
    "svc.ms","sfbassets.com","sfx.ms",
    "teams.microsoft.com","skype.com","skypeassets.com",
    "skypeforbusiness.com","lync.com",
    "azure.com","azure.net","azureedge.net","azurerms.com",
    "azurewebsites.net","cloudapp.net","cloudappsecurity.com",
    "trafficmanager.net","msappproxy.net","graph.microsoft.com",
    "static.microsoft","onecdn.static.microsoft",
    "res.public.onecdn.static.microsoft",
    "officecdn.microsoft.com","cdn.office.net","res.cdn.office.net",
    "aspnetcdn.com","msecnd.net","msedge.net",
    "msocdn.com","msocsp.com","gfx.ms","onestore.ms",
    "mstea.ms","staffhub.ms","akadns.net",
    "windows.com","windows.net","windows-ppe.net",
    "windowsazure.com","windowsupdate.com",
    "dl.delivery.mp.microsoft.com","do.dsp.mp.microsoft.com",
    "wns.windows.com",
    "live.com","live.net","hotmail.com","msn.com",
    "bing.com","bingapis.com","aka.ms",
    "yammer.com","yammerusercontent.com","assets-yammer.com",
    "sway.com","sway-cdn.com","sway-extensions.com",
    "visualstudio.com","virtualearth.net","omniroot.com",
    "aadrm.com","msft.net","xboxlive.com","gamepass.com"
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
    "objects.githubusercontent.com",
    "opencode.ai","deepseek.com"
  ],
  probe: "https://api.github.com/rate_limit"
};

// ============================================================
// DNS
// ============================================================
const allApiDomains = [
  ...AICopilot.domains,...AIGemini.domains,
  ...AIGrok.domains,...AIClaude.domains,...APIAI.domains
];

const dnsConfig = {
  enable: true,
  listen: useFakeIP ? "127.0.0.1:53" : undefined,
  ipv6: false,
  "enhanced-mode": useFakeIP ? "fake-ip" : "redir-host",
  "fake-ip-range": "198.18.0.1/16",
  "fake-ip-filter": useFakeIP ? [
    "+.lan","+_tcp.local","+_udp.local","+_services._dns-sd._udp.local",
    ...customDirectDomains.flatMap(d => [`+.${d}`, d]),
    ...windowsConnectTest.flatMap(d => [d, `+.${d}`]),
    "+.microsoft.com","+.static.microsoft",
    "+.onecdn.static.microsoft","+.res.public.onecdn.static.microsoft",
    "+.cloud.microsoft",
    "+.officecdn.microsoft.com","+.cdn.office.net","+.res.cdn.office.net",
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
    "https://dns.google/dns-query",
    "https://cloudflare-dns.com/dns-query"
  ],
  "proxy-server-nameserver": ["https://dns.google/dns-query"],
  "nameserver-policy": {
    "geosite:cn":      ["223.5.5.5","119.29.29.29"],
    "geosite:private": ["223.5.5.5","119.29.29.29"],
    ...Object.fromEntries(
      windowsConnectTest.map(d => [d, ["223.5.5.5","119.29.29.29"]])
    ),
    ...Object.fromEntries(
      allApiDomains.map(d => [
        `DOMAIN-SUFFIX,${d}`,
        ["https://dns.google/dns-query","https://cloudflare-dns.com/dns-query"]
      ])
    ),
  },
  "respect-rules": true,
  "fallback": [],
  "query-timeout": 3000
};

// ============================================================
// Rule Providers
// ============================================================
const ruleProviders = {
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
  }
};

// ============================================================
// 主函数
// ============================================================
async function main(config){
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

  // ipinfo 映射（FINAL_FALLBACK 时跳过，节省时间）
  let copilotNodes = usSafe;
  let geminiNodes  = [...usSafe,...jpSafe];
  let grokNodes    = usSafe;
  let claudeNodes  = [...usSafe,...deSafe];
  let apiNodes     = [...usSafe,...deSafe];
  let webNodes     = aiSafe;

  if (!FINAL_FALLBACK){
    const mapped = {
      copilot:new Set(),gemini:new Set(),grok:new Set(),
      claude:new Set(),api:new Set(),web:new Set(),video:new Set()
    };
    const BATCH = 10;
    for (let i = 0; i < proxies.length; i += BATCH){
      await Promise.all(
        proxies.slice(i, i+BATCH).map(async p => {
          if (!p?.server) return;
          const info = await queryIpInfo(p.server);
          const key  = classifyByIpInfo(info);
          if (key && mapped[key]) mapped[key].add(p.name);
        })
      );
    }
    const g = (key, fallback) => {
      const arr = [...mapped[key]];
      return arr.length ? arr : fallback;
    };
    copilotNodes = g("copilot", usSafe);
    geminiNodes  = g("gemini",  [...usSafe,...jpSafe]);
    grokNodes    = g("grok",    usSafe);
    claudeNodes  = g("claude",  [...usSafe,...deSafe]);
    apiNodes     = g("api",     [...usSafe,...deSafe]);
    webNodes     = g("web",     aiSafe);
  }

  const videoNodes = [...jpNodes,...sgNodes]
    .filter(n => !usReg.test(n) && !deReg.test(n));
  const videoSafe  = videoNodes.length ? [...videoNodes,"DIRECT"] : ["DIRECT"];
  const chatNodes  = [...jpNodes,...sgNodes]
    .filter(n => !usReg.test(n) && !deReg.test(n));
  const chatSafe   = chatNodes.length ? [...chatNodes,"DIRECT"] : ["DIRECT"];

  const gen   = (arr, grp) => arr.map(d  => `DOMAIN-SUFFIX,${d},${grp},no-resolve`);
  const genIP = (arr, grp) => arr.map(ip => `IP-CIDR,${ip},${grp},no-resolve`);

  // ============================================================
  // 🆘 FINAL_FALLBACK 模式：极简代理组，全走主选优
  // ============================================================
  if (FINAL_FALLBACK){
    config["proxy-groups"] = [
      { name:"♻️ 主选优", type:"select", "include-all":true },
      { name:"🐟 漏网之鱼", type:"select", proxies:["♻️ 主选优","DIRECT"] }
    ];
    config.rules = [
      "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
      "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
      "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
      ...customDirectDomains.flatMap(d=>[
        `DOMAIN,${d},DIRECT,no-resolve`,
        `DOMAIN-SUFFIX,${d},DIRECT,no-resolve`
      ]),
      ...windowsConnectTest.flatMap(d=>[
        `DOMAIN,${d},DIRECT,no-resolve`,
        `DOMAIN-SUFFIX,${d},DIRECT,no-resolve`
      ]),
      "RULE-SET,cn_domain,DIRECT",
      "RULE-SET,cn_ip,DIRECT",
      "GEOIP,CN,DIRECT,no-resolve",
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
    { name:"♻️ 主选优",    type:enableMainUrlTest?"url-test":"select", "include-all":true },
    { name:"🎬 视频",      type:"select", proxies:videoSafe },
    { name:"💬 聊天",      type:"select", proxies:chatSafe  },

    { name:"🪄 Copilot-主", type:"url-test", url:AICopilot.probe, interval:120, timeout:3500, tolerance:100, proxies:copilotNodes },
    { name:"🪄 Copilot",    type:"fallback",  url:AICopilot.probe, interval:120, timeout:3500, proxies:["🪄 Copilot-主","♻️ 主选优"] },

    { name:"🤖 Gemini-主",  type:"url-test", url:AIGemini.probe,  interval:120, timeout:3500, tolerance:100, proxies:geminiNodes },
    { name:"🤖 Gemini",     type:"fallback",  url:AIGemini.probe,  interval:120, timeout:3500, proxies:["🤖 Gemini-主","♻️ 主选优"] },

    { name:"🗨️ Grok",   type:enableAiUrlTest?"url-test":"select", url:AIGrok.probe,   interval:120, timeout:3500, tolerance:100, proxies:grokNodes  },
    { name:"🧠 Claude",  type:enableAiUrlTest?"url-test":"select", url:AIClaude.probe, interval:120, timeout:3500, tolerance:100, proxies:claudeNodes },
    { name:"🔬 其他AI",  type:enableAiUrlTest?"url-test":"select", proxies:webNodes },

    { name:"🔧 API-AI-主", type:"url-test", url:APIAI.probe, interval:120, timeout:3500, tolerance:100, proxies:apiNodes },
    { name:"🔧 API-AI",    type:"fallback",  url:APIAI.probe, interval:120, timeout:3500, proxies:["🔧 API-AI-主","🔬 其他AI"] },

    { name:"🐟 漏网之鱼", type:"select", proxies:["♻️ 主选优","DIRECT"] }
  ];

  config.rules = [
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    ...windowsConnectTest.flatMap(d=>[
      `DOMAIN,${d},DIRECT,no-resolve`,
      `DOMAIN-SUFFIX,${d},DIRECT,no-resolve`
    ]),
    ...customDirectDomains.flatMap(d=>[
      `DOMAIN,${d},DIRECT,no-resolve`,
      `DOMAIN-SUFFIX,${d},DIRECT,no-resolve`
    ]),
    "AND,((NETWORK,udp),(DST-PORT,443)),REJECT",
    ...gen(Video.domains,     "🎬 视频"),
    ...gen(Chat.domains,      "💬 聊天"),
    ...genIP(Chat.ipcidr,     "💬 聊天"),
    ...gen(AICopilot.domains, "🪄 Copilot"),
    ...gen(AIGemini.domains,  "🤖 Gemini"),
    ...gen(AIGrok.domains,    "🗨️ Grok"),
    ...gen(AIClaude.domains,  "🧠 Claude"),
    ...gen(AIother.domains,   "🔬 其他AI"),
    ...gen(APIAI.domains,     "🔧 API-AI"),
    "RULE-SET,ai_all,🔬 其他AI",
    "RULE-SET,cn_domain,DIRECT",
    "RULE-SET,cn_ip,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",
    "MATCH,🐟 漏网之鱼"
  ];

  config.dns = dnsConfig;
  config["rule-providers"] = ruleProviders;
  proxies.forEach(p => { p.udp = true; });
  return config;
}
