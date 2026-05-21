// ============================================================
// ✅ Clash Meta · V16 自动智能版（运维级）
// ============================================================

const useFakeIP = false;

// ========= 工具 =========
function safeArray(arr){return Array.isArray(arr)?arr:[]}
function uniq(arr){return [...new Set(safeArray(arr).filter(Boolean))]}

// ========= 域名 =========

// 强AI（贵）
const AI_STRONG = [
  "api.anthropic.com",
  "api.copilot.microsoft.com",
  "copilot.microsoft.com"
];

// 普通AI
const AI_WEAK = [
  "gemini.google.com",
  "perplexity.ai",
  "poe.com"
];

// API
const API = [
  "github.com",
  "api.github.com",
  "raw.githubusercontent.com"
];

// Cloudflare
const CF = [
  "cloudflare.dev",
  "cdnjs.cloudflare.com",
  "dash.cloudflare.com"
];

// ========= DNS =========
const dnsConfig = {
  enable:true,
  ipv6:false,
  "enhanced-mode": useFakeIP?"fake-ip":"redir-host",
  "nameserver":["223.5.5.5","119.29.29.29"],
  "fallback":["https://dns.google/dns-query","https://1.1.1.1/dns-query"],
  "fallback-filter":{geoip:true,geoipCode:"CN"}
};

// ========= 主函数 =========
function main(config){

  const proxies = safeArray(config.proxies);
  const names = uniq(proxies.map(p=>p && p.name).filter(Boolean));

  // ================= Proxy Groups =================

  config["proxy-groups"] = [

    // ================= 总控 =================
    {
      name:"⚙️ 总控",
      type:"select",
      proxies:[
        "🚀 主线路",
        "🧠 AI专用",
        "☁️ CF保护",
        "DIRECT"
      ]
    },

    // ================= 主线路（低延迟） =================
    {
      name:"🚀 主线路",
      type:"select",
      proxies:names
    },

    // ================= 自动备用（不测速） =================
    {
      name:"🟡 主线路-自动",
      type:"fallback",
      url:"http://www.gstatic.com/generate_204",
      interval:300,
      proxies:names
    },

    // ================= AI 专用池 =================
    {
      name:"🧠 AI专用",
      type:"select",
      proxies:[
        "🧠 AI自动",
        "🚀 主线路",
        "DIRECT"
      ]
    },

    {
      name:"🧠 AI自动",
      type:"fallback",
      url:"http://www.gstatic.com/generate_204",
      interval:600,
      proxies:names
    },

    // ================= 强AI防爆 =================
    {
      name:"🔥 强AI",
      type:"select",
      proxies:[
        "🧠 AI专用",
        "🚀 主线路",
        "DIRECT"
      ]
    },

    // ================= 弱AI =================
    {
      name:"🌿 弱AI",
      type:"select",
      proxies:[
        "🧠 AI专用",
        "DIRECT"
      ]
    },

    // ================= API =================
    {
      name:"🔧 API",
      type:"select",
      proxies:[
        "🚀 主线路",
        "DIRECT"
      ]
    },

    // ================= CF保护 =================
    {
      name:"☁️ CF保护",
      type:"select",
      proxies:[
        "DIRECT",
        "🚀 主线路"
      ]
    },

    // ================= FINAL =================
    {
      name:"🐟 FINAL",
      type:"select",
      proxies:[
        "DIRECT",
        "🚀 主线路",
        "🟡 主线路-自动"
      ]
    }
  ];

  // ================= Rules =================
  config.rules = [

    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",

    // 强AI
    ...AI_STRONG.map(d=>`DOMAIN-SUFFIX,${d},🔥 强AI`),

    // 弱AI
    ...AI_WEAK.map(d=>`DOMAIN-SUFFIX,${d},🌿 弱AI`),

    // API
    ...API.map(d=>`DOMAIN-SUFFIX,${d},🔧 API`),

    // CF
    ...CF.map(d=>`DOMAIN-SUFFIX,${d},☁️ CF保护`),

    // 国内
    "GEOIP,CN,DIRECT",

    // 兜底
    "MATCH,🐟 FINAL"
  ];

  config.dns = dnsConfig;

  return config;
}
``
