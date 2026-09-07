import { NextResponse } from "next/server";
import { ordersService } from "@/lib/services";
import { handleRouteError, badRequest } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { paid?: boolean };
    const result = await ordersService.deliver(id, Boolean(body.paid));
    if ("error" in result) return badRequest(result.error);
    return NextResponse.json({ data: result });
  } catch (err) {
    return handleRouteError("[POST /api/orders/[id]/deliver]", err);
  }
}
