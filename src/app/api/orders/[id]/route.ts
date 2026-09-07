import { NextResponse } from "next/server";
import { ordersService } from "@/lib/services";
import { handleRouteError, notFound } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await ordersService.getById(id);
    if (!order) return notFound("Không tìm thấy đơn hàng");
    return NextResponse.json({ data: order });
  } catch (err) {
    return handleRouteError("[GET /api/orders/[id]]", err);
  }
}
