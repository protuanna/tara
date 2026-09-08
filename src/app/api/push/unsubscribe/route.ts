import { NextResponse, type NextRequest } from "next/server";
import { pushService } from "@/lib/services";
import { handleRouteError, badRequest } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { endpoint?: string };
    if (!body.endpoint) return badRequest("Thiếu endpoint");
    await pushService.unsubscribe(body.endpoint);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    return handleRouteError("[POST /api/push/unsubscribe]", err);
  }
}
