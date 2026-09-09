/**
 * Normalizes text for client-side search matching: lowercase, Vietnamese
 * diacritics stripped, so "tra" / "TRÀ" / "trà" all match "Trà Đào Vàng".
 * `đ`/`Đ` don't decompose via NFD (it's a distinct letter, not a base
 * character + combining mark, unlike the rest of the Vietnamese alphabet),
 * so it needs its own explicit replacement. Used everywhere a screen
 * filters an already-loaded list by name (`/sale`, `<ProductPicker>`,
 * `<CustomerPicker>`, `/customers`, `/debt`) — apply to both the query and
 * the field being matched against.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
