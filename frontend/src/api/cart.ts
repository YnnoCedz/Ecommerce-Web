import { apiFetch } from "./client";
import { singleFlight } from "./requestCache";

export type CartItem = {
  id: number;
  seller_id: number;
  seller_slug: string | null;
  seller_name: string;
  product_id: number;
  product_variant_id: number | null;
  product_slug: string | null;
  product_name: string | null;
  variant_name: string | null;
  image: string | null;
  quantity: number;
  unit_price: number;
  original_unit_price: number | null;
  discount_percentage: number;
  pricing_source: "regular" | "sale" | "promotion" | "voucher";
  promotion: { id: number; name: string | null; ends_at: string | null } | null;
  line_total: number;
  stock: number;
  saved_for_later: boolean;
  eligible_discounts: CartDiscountOption[];
  selected_discount: CartDiscountSelection | null;
  selected_discount_details: CartDiscountOption | null;
  discount_amount: number;
};

export type CartDiscountSelection = { type: "promotion" | "voucher"; id: number };
export type CartDiscountOption = CartDiscountSelection & {
  name: string;
  discount_type: string;
  discount_value: number;
  estimated_discount: number;
  estimated_final_price: number;
  ends_at: string | null;
  minimum_spend: number | null;
};

export type CartSellerGroup = {
  slug: string | null;
  name: string;
  rating: number;
  freeShippingThreshold: number;
  shippingFee: number;
  items: CartItem[];
  subtotal: number;
  shipping: number;
};

export type CartData = {
  id: number;
  status: string;
  promo_code: string | null;
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  grand_total: number;
  items: CartItem[];
  saved_items: CartItem[];
  sellers: CartSellerGroup[];
};

type CartResponse = {
  message?: string;
  data: CartData;
};

export async function fetchCart() {
  return singleFlight("cart:current", () => apiFetch<CartResponse>("/cart"));
}

export async function addCartItem(payload: {
  product_id: number;
  product_variant_id?: number | null;
  quantity?: number;
  saved_for_later?: boolean;
}) {
  return apiFetch<CartResponse>("/cart/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCartItem(itemId: number, payload: {
  quantity?: number;
  saved_for_later?: boolean;
}) {
  return apiFetch<CartResponse>(`/cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateCartItemDiscount(itemId: number, selected_discount: CartDiscountSelection | null) {
  return apiFetch<CartResponse>(`/cart/items/${itemId}/discount`, {
    method: "PATCH",
    body: JSON.stringify({ selected_discount }),
  });
}

export async function removeCartItem(itemId: number) {
  return apiFetch<CartResponse>(`/cart/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function updateCartPromo(payload: { promo_code: string | null }) {
  return apiFetch<CartResponse>("/cart/promo", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
