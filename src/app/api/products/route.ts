import { NextResponse, type NextRequest } from "next/server";
import { productsService } from "@/lib/services";
import { handleRouteError, badRequest } from "@/lib/api";

export async function GET() {
  try {
    const data = await productsService.list();
    return NextResponse.json({ data });
  } catch (err) {
    return handleRouteError("[GET /api/products]", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { name?: string; price?: number; categoryId?: string };
    const result = await productsService.create({
      name: body.name ?? "",
      price: Number(body.price),
      categoryId: body.categoryId ?? "",
    });
    if ("error" in result) return badRequest(result.error);
    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (err) {
    return handleRouteError("[POST /api/products]", err);
  }
}
