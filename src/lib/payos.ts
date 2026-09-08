import { PayOS } from "@payos/node";

/**
 * Server-only payOS Merchant API client, same rule as
 * `src/lib/supabase/server.ts` — only import this from the services layer
 * or a route handler, never a Client Component (PAYOS_API_KEY/
 * PAYOS_CHECKSUM_KEY must never reach the browser). Credentials come from
 * PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY (see
 * .env.local.example); unset in dev until those are filled in.
 */
export const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID ?? "",
  apiKey: process.env.PAYOS_API_KEY ?? "",
  checksumKey: process.env.PAYOS_CHECKSUM_KEY ?? "",
});
