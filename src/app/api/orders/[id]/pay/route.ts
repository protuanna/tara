import { NextResponse } from "next/server";
import { ordersService } from "@/lib/services";
import { handleRouteError, badRequest } from "@/lib/api";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await ordersService.markPaid(id);
    if ("error" in result) return badRequest(result.error);
    return NextResponse.json({ data: result });
  } catch (err) {
    return handleRouteError("[POST /api/orders/[id]/pay]", err);
  }
}
