// 已优化：Worker 低请求版（无 url-test）
// 使用方法：直接替换原 JS 文件

const useFakeIP = true;
const FINAL_FALLBACK = true;

function main(config) {
  const proxies = Array.isArray(config.proxies) ? config.proxies : [];

  config["proxy-groups"] = [
    {
      name: "⚙️ 节点选择",
      type: "select",
      proxies: ["🤖 自动选择","💸 AI开发","🔗 全局直连","DIRECT"]
    },

    {
      name: "🤖 自动选择",
      type: "fallback",
      "include-all": true,
      url: "http://www.gstatic.com/generate_204",
      interval: 0
    },

    {
      name: "💸 AI开发",
      type: "fallback",
      "include-all": true,
      url: "https://api.github.com/",
      interval: 0
    },

    { name:"✋ Copilot-手动", type:"select", "include-all":true },
    { name:"✋ Claude-手动",  type:"select", "include-all":true },
    { name:"✋ Gemini-手动",  type:"select", "include-all":true },
    { name:"✋ Grok-手动",    type:"select", "include-all":true },
    { name:"✋ 其他AI-手动",  type:"select", "include-all":true },
    { name:"✋ API-手动",     type:"select", "include-all":true },

    {
      name: "🔗 全局直连",
      type: "select",
      proxies: ["DIRECT","🤖 自动选择"]
    },

    {
      name: "🎬 视频",
      type: "fallback",
      "include-all": true,
      url: "http://www.gstatic.com/generate_204",
      interval: 0
    },
    {
      name: "💬 聊天/TG",
      type: "fallback",
      "include-all": true,
      url: "http://www.gstatic.com/generate_204",
      interval: 0
    },

    { name:"🪄 Copilot", type:"select", proxies:["✋ Copilot-手动","💸 AI开发","🤖 自动选择","DIRECT"] },
    { name:"🧠 Claude",  type:"select", proxies:["✋ Claude-手动","💸 AI开发","🤖 自动选择","DIRECT"] },
    { name:"🤖 Gemini",  type:"select", proxies:["✋ Gemini-手动","💸 AI开发","🤖 自动选择","DIRECT"] },
    { name:"🗨️ Grok",    type:"select", proxies:["✋ Grok-手动","💸 AI开发","🤖 自动选择","DIRECT"] },
    { name:"🔬 其他AI",  type:"select", proxies:["✋ 其他AI-手动","💸 AI开发","🤖 自动选择","DIRECT"] },
    { name:"🔧 API-AI", type:"select", proxies:["✋ API-手动","💸 AI开发","🤖 自动选择","DIRECT"] },

    {
      name: "🐟 漏网之鱼",
      type: "select",
      proxies: ["⚙️ 节点选择","🔗 全局直连","DIRECT"]
    }
  ];

  return config;
}
