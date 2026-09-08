import { NextResponse } from "next/server";
import { ordersService } from "@/lib/services";
import { badRequest, handleRouteError, notFound } from "@/lib/api";

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!Array.isArray(body.items) || typeof body.customerId !== "string") {
      return badRequest("Dữ liệu không hợp lệ");
    }
    const result = await ordersService.update(id, {
      customerId: body.customerId,
      items: body.items,
      fee: Number(body.fee) || 0,
      toppingFee: Number(body.toppingFee) || 0,
      discount: Number(body.discount) || 0,
      discountType: body.discountType === "pct" ? "pct" : "vnd",
    });
    if ("error" in result) return badRequest(result.error);
    return NextResponse.json({ data: result.data });
  } catch (err) {
    return handleRouteError("[PATCH /api/orders/[id]]", err);
  }
}
