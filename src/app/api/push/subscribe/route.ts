import { NextResponse, type NextRequest } from "next/server";
import { pushService } from "@/lib/services";
import { handleRouteError, badRequest } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return badRequest("Thiếu thông tin subscription");
    }
    await pushService.subscribe({
      endpoint: body.endpoint,
      keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    });
    return NextResponse.json({ data: { ok: true } }, { status: 201 });
  } catch (err) {
    return handleRouteError("[POST /api/push/subscribe]", err);
  }
}
