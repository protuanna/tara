import { NextResponse, type NextRequest } from "next/server";
import { reportService, parseReportPeriod } from "@/lib/services/reportService";
import { handleRouteError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const period = parseReportPeriod(sp.get("period"));
    const data = await reportService.getReport(period, {
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });
    return NextResponse.json({ data });
  } catch (err) {
    return handleRouteError("[GET /api/report]", err);
  }
}
