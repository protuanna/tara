import { NextResponse } from "next/server";
import { ordersService, payosService } from "@/lib/services";
import type { Webhook } from "@payos/node";

/**
 * payOS calls this both to send real payment notifications and, once, to
 * validate the URL during `webhooks.confirm()` (see
 * scripts/register-payos-webhook.mjs) — the validation call is itself a
 * properly-signed payload, so it's handled by the same signature check
 * below, no special-casing needed.
 *
 * Always returns 200 once the signature is valid, even if the payment
 * itself failed/was cancelled (`webhookData.code !== "00"`) or the order
 * lookup found nothing — payOS retries non-2xx responses, and none of
 * those cases are things retrying would fix.
 */
export async function POST(request: Request) {
  let body: Webhook;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let webhookData;
  try {
    webhookData = await payosService.verifyWebhook(body);
  } catch (err) {
    console.error("[POST /api/webhooks/payos] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (webhookData.code === "00") {
    try {
      await ordersService.markPaidViaWebhook(webhookData.orderCode, webhookData.amount);
    } catch (err) {
      console.error("[POST /api/webhooks/payos] failed to mark order paid", err);
    }
  }

  return NextResponse.json({ success: true });
}
