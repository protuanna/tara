import type { FulfillmentStatus, PaymentStatus, PaymentMethod } from "@/lib/supabase/types";

export const FULFILLMENT_LABEL: Record<
  FulfillmentStatus,
  { label: string; bg: string; fg: string }
> = {
  pending: { label: "Chờ xác nhận", bg: "bg-pending-bg", fg: "text-pending" },
  processing: { label: "Đang xử lý", bg: "bg-processing-bg", fg: "text-processing" },
  done: { label: "Đã giao", bg: "bg-done-bg", fg: "text-done" },
  cancel: { label: "Đã hủy", bg: "bg-cancel-bg", fg: "text-cancel" },
};

export const PAYMENT_LABEL: Record<PaymentStatus, { label: string; fg: string }> = {
  paid: { label: "Đã thanh toán", fg: "text-paid" },
  debt: { label: "Đã ghi nợ", fg: "text-debt" },
  unpaid: { label: "Chưa thanh toán", fg: "text-unpaid" },
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Tiền mặt",
  qr: "Chuyển khoản",
  debt: "Ghi nợ",
  unpaid: "Chưa thu",
};
