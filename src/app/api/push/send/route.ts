import { NextResponse, type NextRequest } from "next/server";
import { pushService, notificationsService } from "@/lib/services";
import { handleRouteError, badRequest } from "@/lib/api";

// Test-only endpoint: fans a notification out to every stored push
// subscription, and logs the same message to the in-app notification feed
// (the header bell) so there's a persistent record even on devices that
// never subscribed to push. There's no per-user targeting yet — fine for a
// single-device/single-shop trial, revisit if this ever needs to notify a
// specific customer/device.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { title?: string; body?: string; url?: string };
    const title = body.title?.trim() || "Tara Shop";
    const text = body.body?.trim() || "Thông báo thử nghiệm";
    if (title.length === 0) return badRequest("Thiếu tiêu đề");

    // The in-app feed and the OS-level push are independent — always log
    // the notification even if push delivery fails (e.g. no VAPID keys
    // configured yet, or no device has subscribed).
    let result: { sent: number; removed: number } = { sent: 0, removed: 0 };
    let pushError: string | null = null;
    try {
      result = await pushService.sendToAll({ title, body: text, url: body.url });
    } catch (err) {
      pushError = err instanceof Error ? err.message : "Gửi push thất bại";
    }
    await notificationsService.create({ title, body: text, url: body.url });

    return NextResponse.json({ data: { ...result, pushError } });
  } catch (err) {
    return handleRouteError("[POST /api/push/send]", err);
  }
}
