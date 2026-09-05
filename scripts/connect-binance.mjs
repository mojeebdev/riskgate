const baseUrl = (process.env.RISKGATE_URL ?? "https://riskgate.mojeebdev.workers.dev").replace(/\/$/, "");
const adminToken = process.env.RISKGATE_ADMIN_TOKEN;

if (!adminToken) {
  throw new Error("Set RISKGATE_ADMIN_TOKEN before starting the owner-only Binance connection.");
}

const response = await fetch(`${baseUrl}/api/binance/connect`, {
  method: "POST",
  headers: { authorization: `Bearer ${adminToken}` },
});
const payload = await response.json();
if (!response.ok || typeof payload.authorizationUrl !== "string") {
  throw new Error(payload.error ?? "RiskGate could not start Binance OAuth.");
}

console.log("Open this one-time Binance authorization URL in your browser:");
console.log(payload.authorizationUrl);
