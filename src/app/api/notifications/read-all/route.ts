import { NextResponse } from "next/server";
import { notificationsService } from "@/lib/services";
import { handleRouteError } from "@/lib/api";

export async function POST() {
  try {
    await notificationsService.markAllRead();
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    return handleRouteError("[POST /api/notifications/read-all]", err);
  }
}
