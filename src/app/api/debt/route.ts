import { NextResponse } from "next/server";
import { debtService } from "@/lib/services";
import { handleRouteError } from "@/lib/api";

export async function GET() {
  try {
    const data = await debtService.list();
    return NextResponse.json({ data });
  } catch (err) {
    return handleRouteError("[GET /api/debt]", err);
  }
}
