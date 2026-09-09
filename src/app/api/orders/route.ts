import { NextResponse, type NextRequest } from "next/server";
import {
  ordersService,
  parseStatusFilter,
  parseTimeFilter,
  parsePayFilter,
} from "@/lib/services/ordersService";
import { handleRouteError, badRequest } from "@/lib/api";
import type { DiscountType } from "@/lib/pricing";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const { orders, statusCounts } = await ordersService.list({
      status: parseStatusFilter(sp.get("status")),
      time: parseTimeFilter(sp.get("time")),
      pay: parsePayFilter(sp.get("pay")),
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      customerId: sp.get("customerId") ?? undefined,
    });
    return NextResponse.json({ data: { orders, statusCounts } });
  } catch (err) {
    return handleRouteError("[GET /api/orders]", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      customerId?: string;
      items?: { productId: string; name: string; price: number; qty: number }[];
      fee?: number;
      toppingFee?: number;
      discount?: number;
      discountType?: DiscountType;
    };

    if (!body.customerId) return badRequest("Thiếu khách hàng");

    const result = await ordersService.create({
      customerId: body.customerId,
      items: body.items ?? [],
      fee: Number(body.fee) || 0,
      toppingFee: Number(body.toppingFee) || 0,
      discount: Number(body.discount) || 0,
      discountType: body.discountType === "pct" ? "pct" : "vnd",
    });
    if ("error" in result) return badRequest(result.error);
    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (err) {
    return handleRouteError("[POST /api/orders]", err);
  }
}
