import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type SendResult = { sent: number; removed: number };

export const pushService = {
  async subscribe(sub: PushSubscriptionInput): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        { onConflict: "endpoint" },
      );
    if (error) throw error;
  },

  async unsubscribe(endpoint: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw error;
  },

  /** Sends to every stored subscription; prunes ones the push service reports as gone (404/410). */
  async sendToAll(payload: { title: string; body: string; url?: string }): Promise<SendResult> {
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("Thiếu VAPID key trong biến môi trường");
    }
    const supabase = await createClient();
    const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
    if (error) throw error;

    let sent = 0;
    const deadEndpoints: string[] = [];

    await Promise.all(
      (subs ?? []).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          );
          sent += 1;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            deadEndpoints.push(sub.endpoint);
          } else {
            console.error("push send failed", sub.endpoint, err);
          }
        }
      }),
    );

    if (deadEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
    }

    return { sent, removed: deadEndpoints.length };
  },
};
