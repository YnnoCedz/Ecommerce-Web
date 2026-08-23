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
  seller_order_id: number;
  reviewed: boolean;
  review_id: number | null;
};

export type BuyerOrderDetail = {
  id: number;
  order_number: string | null;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  grand_total: number;
  placed_at: string | null;
  completed_at: string | null;
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
    seller_id: number;
    seller_name: string;
    status: string;
    subtotal: number;
    shipping_fee: number;
    discount_total: number;
    grand_total: number;
    tracking_number: string | null;
    driver_name: string | null;
    courier_name: string | null;
    delivered_at: string | null;
    completed_at: string | null;
    can_mark_received: boolean;
    can_cancel: boolean;
    can_return: boolean;
    cancellation: { reason: string; refunded_amount: number; cancelled_at: string | null } | null;
    return_requests: BuyerReturnRequest[];
    tracking_events: Array<{
      id: number;
      status: string;
      location: string | null;
      note: string | null;
      occurred_at: string | null;
    }>;
  }>;
  payments: BuyerPayment[];
};

export type BuyerPayment = {
  id: number;
  type: "charge" | "refund";
  method: string;
  provider: string | null;
  status: string;
  amount: number;
  refunded_amount: number;
  currency: string;
  reference: string | null;
  card_brand: string | null;
  card_last4: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string | null;
  sandbox: boolean;
};

export type BuyerReturnRequest = {
  id: number;
  status: string;
  reason: string;
  requested_amount: number;
  refunded_amount: number;
  requested_at: string | null;
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

export async function completeSellerOrder(orderNumber: string, sellerOrderId: number) {
  return apiFetch<{
    message: string;
    data: { id: number; status: string; completed_at: string | null; order_status: string };
  }>(`/orders/${encodeURIComponent(orderNumber)}/seller-orders/${sellerOrderId}/complete`, {
    method: "POST",
  });
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
  payment: BuyerPayment;
  sandbox: boolean;
};

export async function submitCheckout(payload: {
  address_id: number;
  payment_method: "cod" | "gcash" | "maya" | "card";
  payment_details?: {
    mobile_number?: string;
    cardholder_name?: string;
    card_last4?: string;
    card_brand?: string;
  };
  cart_item_ids?: number[];
  buyer_notes?: string | null;
}) {
  return apiFetch<{ message: string; data: CheckoutResult }>("/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function retryOrderPayment(orderNumber: string, payment_details?: Parameters<typeof submitCheckout>[0]["payment_details"]) {
  return apiFetch<{ message: string; data: BuyerPayment }>(`/orders/${encodeURIComponent(orderNumber)}/payments/retry`, {
    method: "POST",
    body: JSON.stringify({ payment_details }),
  });
}

export function cancelSellerOrder(orderNumber: string, sellerOrderId: number, reason: string) {
  return apiFetch<{ message: string }>(`/orders/${encodeURIComponent(orderNumber)}/seller-orders/${sellerOrderId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function requestReturn(orderNumber: string, sellerOrderId: number, payload: { reason: string; buyer_statement?: string; items: Array<{ order_item_id: number; quantity: number }>; evidence?: File[] }) {
  const form = new FormData();
  form.set("reason", payload.reason);
  if (payload.buyer_statement) form.set("buyer_statement", payload.buyer_statement);
  payload.items.forEach((item, index) => {
    form.set(`items[${index}][order_item_id]`, String(item.order_item_id));
    form.set(`items[${index}][quantity]`, String(item.quantity));
  });
  payload.evidence?.forEach((file) => form.append("evidence[]", file));
  return apiFetch<{ message: string }>(`/orders/${encodeURIComponent(orderNumber)}/seller-orders/${sellerOrderId}/returns`, { method: "POST", body: form });
}
