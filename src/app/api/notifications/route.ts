import { NextResponse } from "next/server";
import { notificationsService } from "@/lib/services";
import { handleRouteError } from "@/lib/api";

export async function GET() {
  try {
    const data = await notificationsService.list();
    return NextResponse.json({ data });
  } catch (err) {
    return handleRouteError("[GET /api/notifications]", err);
  }
}
