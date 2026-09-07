import { NextResponse, type NextRequest } from "next/server";
import { pushService } from "@/lib/services";
import { handleRouteError, badRequest } from "@/lib/api";

// Test-only endpoint: fans a notification out to every stored
// subscription. There's no per-user targeting yet — fine for a
// single-device/single-shop trial, revisit if this ever needs to notify
// a specific customer/device.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { title?: string; body?: string; url?: string };
    const title = body.title?.trim() || "Tara Shop";
    const text = body.body?.trim() || "Thông báo thử nghiệm";
    if (title.length === 0) return badRequest("Thiếu tiêu đề");
    const result = await pushService.sendToAll({ title, body: text, url: body.url });
    return NextResponse.json({ data: result });
  } catch (err) {
    return handleRouteError("[POST /api/push/send]", err);
  }
}
