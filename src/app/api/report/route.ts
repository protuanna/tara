import { NextResponse, type NextRequest } from "next/server";
import { reportService, parseReportPeriod } from "@/lib/services/reportService";
import { handleRouteError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const period = parseReportPeriod(request.nextUrl.searchParams.get("period"));
    const data = await reportService.getReport(period);
    return NextResponse.json({ data });
  } catch (err) {
    return handleRouteError("[GET /api/report]", err);
  }
}
