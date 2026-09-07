import { NextResponse, type NextRequest } from "next/server";
import { customersService } from "@/lib/services";
import { handleRouteError, badRequest } from "@/lib/api";

export async function GET() {
  try {
    const data = await customersService.list();
    return NextResponse.json({ data });
  } catch (err) {
    return handleRouteError("[GET /api/customers]", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { name?: string; phone?: string | null };
    const result = await customersService.create({ name: body.name ?? "", phone: body.phone ?? null });
    if ("error" in result) return badRequest(result.error);
    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (err) {
    return handleRouteError("[POST /api/customers]", err);
  }
}
