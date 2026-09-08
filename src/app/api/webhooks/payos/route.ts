import { NextResponse } from "next/server";
import { ordersService, payosService, notificationsService, pushService } from "@/lib/services";
import { formatVnd } from "@/lib/format";
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
      const paidOrder = await ordersService.markPaidViaWebhook(webhookData.orderCode, webhookData.amount);
      // `null` means this delivery didn't actually change anything (already
      // paid, amount mismatch, unknown order) — stay quiet rather than
      // re-notifying on every payOS retry of the same webhook.
      if (paidOrder) {
        const title = "Thanh toán thành công";
        const body = `${paidOrder.customerName} đã thanh toán ${formatVnd(paidOrder.total)} qua QR`;
        const url = `/orders/${paidOrder.id}`;
        // Best-effort, independent of each other and of the webhook's own
        // success — a push/notification failure must not make payOS think
        // the webhook itself failed and retry it.
        await notificationsService.create({ title, body, url }).catch((err) => {
          console.error("[POST /api/webhooks/payos] failed to create notification", err);
        });
        await pushService.sendToAll({ title, body, url }).catch((err) => {
          console.error("[POST /api/webhooks/payos] failed to send push", err);
        });
      }
    } catch (err) {
      console.error("[POST /api/webhooks/payos] failed to mark order paid", err);
    }
  }

  return NextResponse.json({ success: true });
}
