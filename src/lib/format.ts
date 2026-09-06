/** e.g. 25000 -> "25.000Đ" — the currency format used throughout the design. */
export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}Đ`;
}
