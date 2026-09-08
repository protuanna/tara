import { formatVnd } from "@/lib/format";
import { formatReceiptDateTime } from "@/lib/date";
import { QrCode } from "@/components/qr-code";
import type { OrderDetailDTO } from "@/lib/services/ordersService";

/**
 * Renders a printable-looking receipt for `order` — plain black-on-white,
 * dashed separators, no app-purple styling — captured to a PNG via
 * html2canvas by the "share" button on `/orders/[id]`
 * (see `order-detail` page's `handleShare`). Kept as a real component (not
 * inline JSX in the page) so it's testable/adjustable on its own; it's
 * rendered off-screen (`position: fixed; left: -9999px`), never shown to
 * the user directly — the shared artifact is the snapshot image, not this
 * DOM.
 */
export function ReceiptTemplate({ order }: { order: OrderDetailDTO }) {
  const shortCode = order.id.slice(0, 8).toUpperCase();
  const customerName = order.customers?.name ?? "Khách lẻ";
  const itemCount = order.order_items.reduce((sum, i) => sum + i.qty, 0);
  const showQr = order.payment_status !== "paid" && order.payos_qr_code;

  return (
    <div className="w-[380px] bg-white p-5 font-sans text-black">
      <div className="text-center text-lg font-extrabold">Tara Shop</div>

      <div className="my-3 border-t border-dashed border-black" />

      <div className="text-center text-base font-extrabold">HÓA ĐƠN BÁN HÀNG</div>
      <div className="mt-1 text-center text-[13px] text-neutral-500">
        {shortCode} · {formatReceiptDateTime(order.created_at)}
      </div>
      <div className="mt-2 text-[14px] font-bold">Khách: {customerName}</div>

      <div className="my-3 border-t border-dashed border-black" />

      <div className="flex text-[12px] font-bold">
        <span className="flex-1">Sản phẩm</span>
        <span className="w-[64px] text-right">Giá</span>
        <span className="w-[28px] text-right">SL</span>
        <span className="w-[72px] text-right">TT</span>
      </div>
      <div className="my-1.5 border-t border-dashed border-neutral-400" />
      <div className="flex flex-col gap-1.5">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex text-[13px]">
            <span className="flex-1 pr-1">{item.name}</span>
            <span className="w-[64px] text-right">{item.price.toLocaleString("vi-VN")}</span>
            <span className="w-[28px] text-right">{item.qty}</span>
            <span className="w-[72px] text-right font-semibold">
              {(item.price * item.qty).toLocaleString("vi-VN")}
            </span>
          </div>
        ))}
      </div>

      <div className="my-3 border-t border-dashed border-black" />

      <div className="flex flex-col gap-1 text-[13px]">
        {order.fee > 0 && (
          <div className="flex justify-between">
            <span>Phí vận chuyển</span>
            <span>{formatVnd(order.fee)}</span>
          </div>
        )}
        {order.topping_fee > 0 && (
          <div className="flex justify-between">
            <span>Topping</span>
            <span>{formatVnd(order.topping_fee)}</span>
          </div>
        )}
        {order.discount_amount > 0 && (
          <div className="flex justify-between">
            <span>Giảm giá</span>
            <span>− {formatVnd(order.discount_amount)}</span>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-[14px] font-extrabold">Tổng cộng {itemCount} SP</span>
        <span className="text-lg font-extrabold text-[#C25A0B]">{formatVnd(order.total)}</span>
      </div>

      {order.payment_status === "debt" && (
        <div className="mt-1 flex justify-between text-[14px] font-bold">
          <span>Nợ cho đơn hàng này</span>
          <span>{formatVnd(order.total)}</span>
        </div>
      )}
      {order.payment_status === "paid" && (
        <div className="mt-1 text-right text-[14px] font-bold text-[#2E9E5B]">Đã thanh toán</div>
      )}

      {showQr && order.payos_qr_code && (
        <>
          <div className="my-3 border-t border-dashed border-black" />
          <div className="flex flex-col items-center gap-1.5">
            <div className="text-[13px] font-bold">Quét mã để thanh toán</div>
            <QrCode value={order.payos_qr_code} size={200} />
          </div>
        </>
      )}

      <div className="my-3 border-t border-dashed border-black" />
      <div className="text-center text-[12px] text-neutral-500">Cảm ơn quý khách!</div>
    </div>
  );
}
