import { apiFetch } from "./client";
import { singleFlight } from "./requestCache";
import type { AuthUser } from "./auth";

export type PaginationMeta = { current_page: number; last_page: number; per_page: number; total: number };
export type AdminUser = { id: number; name: string; email: string; mobile: string; role: "buyer" | "seller" | "admin"; status: string; location: string | null; verified: boolean; orders: number; total_spent: number; joined_at: string | null; last_active_at: string | null };
export type AdminSeller = { id: number; slug: string; business_name: string; trade_name: string | null; status: string; verified: boolean; city: string; province: string; categories: string[]; products: number; orders: number; gmv: number; rating: number; created_at: string | null; user: { id: number; name: string; email: string; mobile: string; status: string } | null };
export type AdminProduct = { id: number; name: string; slug: string; sku: string; price: number; sale_price: number | null; stock: number; status: string; sales: number; seller: { id: number; name: string } | null; category: { id: number; name: string } | null; image_path: string | null; created_at: string | null; updated_at: string | null };
export type AdminDeliveryStatus = "picked-up" | "in-transit" | "out-for-delivery" | "delivered";
export type AdminOrder = {
  id: number; order_number: string; status: string; payment_status: string; grand_total: number; currency: string; buyer_name: string | null; created_at: string | null; updated_at: string | null; payment_method: string | null; placed_at: string | null;
  shipping: { name: string; phone: string; address: string }; buyer: { id: number; name: string; email: string } | null;
  seller_orders: Array<{ id: number; status: string; delivery_status: string | null; next_delivery_status: AdminDeliveryStatus | null; total: number; tracking_number: string | null; delivery_handler: string | null; courier_id: number | null; seller: { id: number; name: string; pickup_address: string } | null; tracking_events: Array<{ id: number; status: string; note: string | null; occurred_at: string | null; actor_type: string | null }> }>;
  items: Array<{ id: number; seller_order_id: number | null; product_name: string; variant_name: string | null; sku: string; quantity: number; unit_price: number; subtotal: number }>;
  payments: Array<{ id: number; type: string; method: string; status: string; amount: number; reference: string | null; created_at: string | null }>;
};
export type AdminCategory = { id: number; parent_id: number | null; name: string; slug: string; icon: string | null; active: boolean; sort_order: number; product_count: number; children: AdminCategory[] };
export type AdminSeriesPoint = { date: string; gmv: number; orders: number; users: number; sellers: number };
export type AdminDashboardData = { range_days: number; generated_at: string; metrics: Record<string, number>; series: AdminSeriesPoint[]; recent_users: AdminUser[]; recent_orders: Array<Pick<AdminOrder, "id" | "order_number" | "status" | "payment_status" | "grand_total" | "currency" | "buyer_name" | "created_at">>; recent_reports: Array<{ id: number; reference: string; reason: string; status: string; created_at: string | null }> };
export type AdminAnalyticsData = { range_days: number; series: AdminSeriesPoint[]; totals: { gmv: number; orders: number; users: number; sellers: number }; categories: Array<{ id: number; name: string; gmv: number; units: number }>; top_sellers: Array<{ id: number; name: string; gmv: number; orders: number; rating: number }>; order_statuses: Record<string, number> };

function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  const value = query.toString();
  return value ? `?${value}` : "";
}

export const fetchAdminDashboard = (days: 7 | 30 | 90) => singleFlight(`admin:dashboard:${days}`, () => apiFetch<{ data: AdminDashboardData }>(`/admin/dashboard?days=${days}`));
export const fetchAdminMe = () => apiFetch<{ user: AuthUser }>("/admin/me");
export const updateAdminProfile = (payload: { first_name: string; last_name: string; phone: string }) => apiFetch<{ message: string; data: Partial<AuthUser> }>("/admin/profile", { method: "PATCH", body: JSON.stringify(payload) });
export const fetchAdminUsers = (params: Record<string, string | number | undefined> = {}) => apiFetch<{ data: AdminUser[]; meta: PaginationMeta }>(`/admin/users${queryString(params)}`);
export const updateAdminUserStatus = (id: number, status: string, reason?: string) => apiFetch<{ message: string; data: AdminUser }>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) });
export const fetchAdminSellers = (params: Record<string, string | number | undefined> = {}) => apiFetch<{ data: AdminSeller[]; meta: PaginationMeta }>(`/admin/sellers${queryString(params)}`);
export const updateAdminSellerStatus = (id: number, status: string, reason?: string) => apiFetch<{ message: string; data: AdminSeller }>(`/admin/sellers/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) });
export const fetchAdminProducts = (params: Record<string, string | number | undefined> = {}) => apiFetch<{ data: AdminProduct[]; meta: PaginationMeta }>(`/admin/products${queryString(params)}`);
export const updateAdminProductStatus = (id: number, status: string, note?: string) => apiFetch<{ message: string; data: AdminProduct }>(`/admin/products/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, note }) });
export const fetchAdminOrders = (params: Record<string, string | number | undefined> = {}) => apiFetch<{ data: AdminOrder[]; meta: PaginationMeta & { gmv: number; open_disputes: number } }>(`/admin/orders${queryString(params)}`);
export const updateAdminDeliveryStatus = (sellerOrderId: number, status: AdminDeliveryStatus) => apiFetch<{ message: string; data: AdminOrder }>(`/admin/seller-orders/${sellerOrderId}/delivery-status`, { method: "PATCH", body: JSON.stringify({ status }) });
export const fetchAdminCategories = () => apiFetch<{ data: AdminCategory[] }>("/admin/categories");
export const createAdminCategory = (payload: Omit<AdminCategory, "id" | "product_count" | "children">) => apiFetch<{ message: string; data: AdminCategory }>("/admin/categories", { method: "POST", body: JSON.stringify(payload) });
export const updateAdminCategory = (id: number, payload: Omit<AdminCategory, "id" | "product_count" | "children">) => apiFetch<{ message: string; data: AdminCategory }>(`/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const fetchAdminAnalytics = (days: 7 | 30 | 90) => apiFetch<{ data: AdminAnalyticsData }>(`/admin/analytics?days=${days}`);
