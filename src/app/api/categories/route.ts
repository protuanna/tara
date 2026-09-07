import { NextResponse, type NextRequest } from "next/server";
import { categoriesService } from "@/lib/services";
import { handleRouteError, badRequest } from "@/lib/api";

export async function GET() {
  try {
    const data = await categoriesService.list();
    return NextResponse.json({ data });
  } catch (err) {
    return handleRouteError("[GET /api/categories]", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { name?: string };
    if (!body.name) return badRequest("Vui lòng nhập tên danh mục");

    const result = await categoriesService.create(body.name);
    if ("error" in result) return badRequest(result.error);
    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (err) {
    return handleRouteError("[POST /api/categories]", err);
  }
}
