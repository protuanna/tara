import { NextResponse, type NextRequest } from "next/server";
import {
  expensesService,
  parseExpenseTimeFilter,
  parseExpenseTypeFilter,
} from "@/lib/services/expensesService";
import { handleRouteError, badRequest } from "@/lib/api";
import type { CashEntryType } from "@/lib/supabase/types";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const time = parseExpenseTimeFilter(sp.get("time"));
    const type = parseExpenseTypeFilter(sp.get("type"));
    const data = await expensesService.list({
      time,
      type,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });
    return NextResponse.json({ data });
  } catch (err) {
    return handleRouteError("[GET /api/expenses]", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      amount?: number;
      note?: string;
      type?: CashEntryType;
    };
    const result = await expensesService.create({
      name: body.name ?? "",
      amount: Number(body.amount),
      note: body.note,
      type: body.type === "thu" ? "thu" : "chi",
    });
    if ("error" in result) return badRequest(result.error);
    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (err) {
    return handleRouteError("[POST /api/expenses]", err);
  }
}
