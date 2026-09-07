import { NextResponse } from "next/server";
import { productsService } from "@/lib/services";
import { handleRouteError } from "@/lib/api";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await productsService.remove(id);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    return handleRouteError("[DELETE /api/products/[id]]", err);
  }
}
