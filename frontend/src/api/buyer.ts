import { apiFetch } from "./client";
import { fetchNotifications } from "./notifications";
import { singleFlight } from "./requestCache";

export type BuyerOrderListItem = {
  id: number;
  order_number: string | null;
  status: string;
  payment_status: string | null;
  grand_total: number;
  placed_at: string | null;
  item_count?: number;
  main_product?: string | null;
  main_image?: string | null;
  seller_names?: string[];
  tracking_number?: string | null;
};

export type BuyerOrderDetailItem = {
  id: number;
  product_name: string | null;
  product_slug: string | null;
  variant_name: string | null;
  sku: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
  image: string | null;
  seller_name: string;
};

export type BuyerOrderDetail = {
  id: number;
  order_number: string | null;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  grand_total: number;
  placed_at: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_line1: string | null;
  shipping_line2: string | null;
  shipping_city: string | null;
  shipping_province: string | null;
  shipping_postal_code: string | null;
  item_count?: number;
  items: BuyerOrderDetailItem[];
  seller_orders: Array<{
    id: number;
    seller_name: string;
    status: string;
    subtotal: number;
    shipping_fee: number;
    discount_total: number;
    grand_total: number;
    tracking_number: string | null;
    driver_name: string | null;
    courier_name: string | null;
  }>;
};

export type WishlistItemRecord = {
  id: number;
  product_id: number;
  added_at: string | null;
  product?: {
    id: number;
    name: string;
    slug: string;
    status: string;
    price: number;
    sale_price: number | null;
    stock_quantity: number;
    low_stock_threshold: number;
    seller?: {
      id: number;
      business_name: string;
      trade_name: string | null;
      slug: string;
    } | null;
    images?: Array<{
      id: number;
      file_path: string;
      is_primary: boolean;
      sort_order: number;
    }>;
  };
};

export type BuyerAddress = {
  id: number;
  label: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
};

export async function fetchBuyerOrders() {
  return singleFlight("buyer:orders", () => apiFetch<{ data: BuyerOrderListItem[] }>("/orders"));
}

export async function fetchBuyerOrder(orderNumber: string) {
  return singleFlight(`buyer:order:${orderNumber}`, () => apiFetch<{ data: BuyerOrderDetail }>(`/orders/${encodeURIComponent(orderNumber)}`));
}

export async function fetchWishlistItems() {
  return singleFlight("buyer:wishlist", () => apiFetch<{ data: WishlistItemRecord[] }>("/wishlists"));
}

export async function fetchWishlistStatus(productId: number) {
  return apiFetch<{ data: { product_id: number; wishlisted: boolean } }>(`/wishlists/${productId}/status`);
}

export async function addWishlistItem(productId: number) {
  return apiFetch<{ message: string; data: { id: number; product_id: number; wishlisted: true } }>("/wishlists", {
    method: "POST",
    body: JSON.stringify({ product_id: productId }),
  });
}

export async function removeWishlistItem(productId: number) {
  return apiFetch<{ message: string; data: { product_id: number; wishlisted: false } }>(`/wishlists/${productId}`, {
    method: "DELETE",
  });
}

export async function fetchBuyerMessages() {
  return singleFlight("buyer:messages", () => apiFetch<{ data: unknown[] }>("/messages"));
}

export async function fetchBuyerReviews() {
  return singleFlight("buyer:reviews", () => apiFetch<{ data: unknown[] }>("/reviews"));
}

export async function fetchBuyerNotifications() {
  return fetchNotifications();
}

export async function fetchAccountAddresses() {
  return singleFlight("buyer:addresses", () => apiFetch<{ data: BuyerAddress[] }>("/account/addresses"));
}

export async function storeAccountAddress(payload: {
  label: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  province: string;
  postal_code: string;
  is_default?: boolean;
}) {
  return apiFetch<{ message: string; data: BuyerAddress }>("/account/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAccountAddress(addressId: number, payload: Omit<BuyerAddress, "id">) {
  return apiFetch<{ message: string; data: BuyerAddress }>(`/account/addresses/${addressId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function removeAccountAddress(addressId: number) {
  return apiFetch<{ message: string }>(`/account/addresses/${addressId}`, {
    method: "DELETE",
  });
}

export type CheckoutResult = {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  grand_total: number;
  seller_order_count: number;
  item_count: number;
};

export async function submitCheckout(payload: {
  address_id: number;
  payment_method: "cod";
  cart_item_ids?: number[];
  buyer_notes?: string | null;
}) {
  return apiFetch<{ message: string; data: CheckoutResult }>("/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
