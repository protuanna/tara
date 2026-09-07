import { NextResponse } from "next/server";
import { customersService } from "@/lib/services";
import { handleRouteError } from "@/lib/api";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await customersService.collectDebt(id);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    return handleRouteError("[POST /api/customers/[id]/collect-debt]", err);
  }
}
