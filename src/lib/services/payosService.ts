import { payos } from "@/lib/payos";
import type { Webhook, WebhookData } from "@payos/node";

export type PayosPaymentLink = {
  qrCode: string;
  checkoutUrl: string;
  paymentLinkId: string;
};

export const payosService = {
  /**
   * Best-effort — creating an order must never fail because payOS is down
   * or misconfigured. Callers should treat `null` as "no QR for this order
   * yet" (the detail page just hides the QR section) rather than surfacing
   * an error to the cashier. `orderCode` is the order's own
   * `payos_order_code` (from the DB sequence), not the order's UUID —
   * payOS requires a unique *numeric* code per payment link.
   */
  async createPaymentLink(input: {
    orderCode: number;
    amount: number;
  }): Promise<PayosPaymentLink | null> {
    if (input.amount <= 0) return null;
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const link = await payos.paymentRequests.create({
        orderCode: input.orderCode,
        amount: Math.round(input.amount),
        // payOS embeds this in the VietQR transfer content, which has a
        // tight character budget — keep it short and ASCII (no dấu) so it
        // never gets silently truncated or rejected.
        description: `Don hang ${input.orderCode}`,
        returnUrl: `${siteUrl}/orders`,
        cancelUrl: `${siteUrl}/orders`,
      });
      return {
        qrCode: link.qrCode,
        checkoutUrl: link.checkoutUrl,
        paymentLinkId: link.paymentLinkId,
      };
    } catch (err) {
      console.error("[payosService.createPaymentLink]", err);
      return null;
    }
  },

  /**
   * Best-effort, same reasoning as `createPaymentLink()` — called right
   * before minting a replacement link when an order is edited, so a failure
   * here (e.g. the link was already paid/expired) shouldn't block the edit
   * or the new link from being created.
   */
  async cancelPaymentLink(paymentLinkId: string): Promise<void> {
    try {
      await payos.paymentRequests.cancel(paymentLinkId, "Đơn hàng đã được chỉnh sửa");
    } catch (err) {
      console.error("[payosService.cancelPaymentLink]", err);
    }
  },

  /**
   * Throws (payOS SDK's `InvalidSignatureError`) if the signature doesn't
   * match — let that propagate so the webhook route rejects the request
   * instead of trusting unverified payment data.
   */
  async verifyWebhook(body: Webhook): Promise<WebhookData> {
    return payos.webhooks.verify(body);
  },

  /** One-time setup call — see scripts/register-payos-webhook.mjs. */
  async confirmWebhook(url: string): Promise<void> {
    await payos.webhooks.confirm(url);
  },
};
