// One-time setup: registers this app's webhook URL with payOS so it starts
// sending payment notifications there. payOS calls the URL once itself to
// validate it responds correctly before registering it — so the app must
// already be deployed and reachable (PAYOS_* env vars set on Vercel too,
// not just locally) before running this.
//
// Usage:
//   node --env-file=.env.local scripts/register-payos-webhook.mjs
// or with an explicit URL:
//   node --env-file=.env.local scripts/register-payos-webhook.mjs https://your-domain/api/webhooks/payos

import { PayOS } from "@payos/node";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const webhookUrl = process.argv[2] ?? `${siteUrl}/api/webhooks/payos`;

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

console.log("Registering webhook URL:", webhookUrl);
const result = await payos.webhooks.confirm(webhookUrl);
console.log("Confirmed:", result);
