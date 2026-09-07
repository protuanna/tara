import { NextResponse } from "next/server";

export type ApiError = {
  error: string;
  message: string;
  statusCode: number;
};

/** Uncaught-error fallback for route handlers — logs, returns a stable 500 shape. */
export function handleRouteError(label: string, err: unknown): NextResponse {
  console.error(label, err);
  return NextResponse.json<ApiError>(
    { error: "Internal Server Error", message: "Đã có lỗi xảy ra", statusCode: 500 },
    { status: 500 },
  );
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json<ApiError>({ error: "Bad Request", message, statusCode: 400 }, {
    status: 400,
  });
}

export function notFound(message = "Không tìm thấy"): NextResponse {
  return NextResponse.json<ApiError>({ error: "Not Found", message, statusCode: 404 }, {
    status: 404,
  });
}
