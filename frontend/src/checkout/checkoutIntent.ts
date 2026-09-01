import type { CartDiscountSelection } from "../api/cart";

const BUY_NOW_INTENT_KEY = "maketo.buy_now_checkout_intent";

export type BuyNowIntent = {
  product_id: number;
  product_variant_id: number | null;
  quantity: number;
  selected_discount?: CartDiscountSelection | null;
};

export function saveBuyNowIntent(intent: BuyNowIntent) {
  window.sessionStorage.setItem(BUY_NOW_INTENT_KEY, JSON.stringify(intent));
}

export function loadBuyNowIntent(): BuyNowIntent | null {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(BUY_NOW_INTENT_KEY) ?? "null") as Partial<BuyNowIntent> | null;
    if (!value || !Number.isInteger(value.product_id) || !Number.isInteger(value.quantity) || Number(value.quantity) < 1) return null;
    return {
      product_id: Number(value.product_id),
      product_variant_id: Number.isInteger(value.product_variant_id) ? Number(value.product_variant_id) : null,
      quantity: Number(value.quantity),
      selected_discount: value.selected_discount ?? null,
    };
  } catch {
    return null;
  }
}

export function clearBuyNowIntent() {
  window.sessionStorage.removeItem(BUY_NOW_INTENT_KEY);
}
