// ============================================================
// qx-override-dns.js — JD fake-IP bypass only
// ============================================================
// Attach this as the profile's JavaScript override in fclash.
// It changes config.dns and nothing else: proxy-groups, rules and
// proxies from the subscription stay exactly as converted.
//
// Why: JD's app verifies its own egress address and its WebView
// rejects anything inside 198.18.0.0/16, so the shop renders blank
// while every other app works. Routing JD to DIRECT does not help
// (it was already DIRECT); only the DNS answer has to be real.

function main(config) {
  config.dns = config.dns || {};

  config.dns["enhanced-mode"] = "fake-ip";
  config.dns["fake-ip-range"] = config.dns["fake-ip-range"] || "198.18.0.1/16";

  // Mihomo only accepts +.domain here; a glob such as *.jd.com is
  // silently dropped and the suffix keeps resolving to a fake address.
  const add = ["+.jd.com", "+.360buyimg.com", "+.jd.hk"];
  const existing = config.dns["fake-ip-filter"] || [];
  config.dns["fake-ip-filter"] = [...new Set([...existing, ...add])];

  return config;
}

// Self-check: node test.mjs  (also runs under `bun test.mjs`)
if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("qx-override-dns.js")) {
  const base = {
    proxies: [{ name: "a" }],
    "proxy-groups": [{ name: "g" }],
    rules: ["MATCH,g"],
    dns: { enable: true, "enhanced-mode": "redir-host", "fake-ip-filter": ["+.lan"] },
  };
  const out = main(JSON.parse(JSON.stringify(base)));
  const f = out.dns["fake-ip-filter"];
  if (out.dns["enhanced-mode"] !== "fake-ip") throw new Error("enhanced-mode not set");
  if (!f.includes("+.jd.com")) throw new Error("jd filter missing");
  if (!f.includes("+.lan")) throw new Error("existing filter dropped");
  if (out.rules.length !== 1 || out.proxies.length !== 1) throw new Error("touched rules/proxies");
  console.log("self-check OK");
}
