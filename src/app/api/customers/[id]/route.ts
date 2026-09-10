import { NextResponse } from "next/server";
import { customersService } from "@/lib/services";
import { badRequest, handleRouteError } from "@/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      phone?: string | null;
      address?: string | null;
    };
    if (typeof body.name !== "string") return badRequest("Dữ liệu không hợp lệ");
    const result = await customersService.update(id, {
      name: body.name,
      phone: body.phone ?? null,
      address: body.address ?? null,
    });
    if ("error" in result) return badRequest(result.error);
    return NextResponse.json({ data: result.data });
  } catch (err) {
    return handleRouteError("[PATCH /api/customers/[id]]", err);
  }
}
