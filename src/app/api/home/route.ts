import { NextResponse } from "next/server";
import { homeService } from "@/lib/services";
import { handleRouteError } from "@/lib/api";

export async function GET() {
  try {
    const data = await homeService.getDashboard();
    return NextResponse.json({ data });
  } catch (err) {
    return handleRouteError("[GET /api/home]", err);
  }
}
