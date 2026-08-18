import { apiFetch } from "./client";

export type SellerProfile = {
  id: number;
  slug: string;
  business_name: string;
  trade_name: string | null;
  tagline: string | null;
  description: string | null;
  contact_email: string | null;
  public_email: string | null;
  contact_phone: string | null;
  messaging_phone: string | null;
  status: string;
  verified: boolean;
  address_line1: string | null;
  address_line2: string | null;
  province: string | null;
  city: string | null;
  postal_code: string | null;
  owner_id_number: string | null;
  tin: string | null;
  registration_number: string | null;
  established_on: string | null;
  categories: Array<{ id: number; name: string; slug: string }>;
};

export type SellerProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  status: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  free_shipping: boolean;
  delivery_type: string | null;
  category: { id: number; name: string; slug: string } | null;
  image: string;
  images: Array<{
    id: number;
    url: string;
    alt: string;
    sort_order: number;
    is_primary: boolean;
  }>;
  variants: Array<{
    id: number;
    name: string;
    sku: string | null;
    stock_quantity: number;
    low_stock_threshold: number;
    active: boolean;
  }>;
  created_at: string | null;
  published_at: string | null;
};

export type SellerOrder = {
  id: number;
  order_number: string | null;
  status: string;
  subtotal: number;
  shipping_fee: number;
  discount_total: number;
  grand_total: number;
  confirmed_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  placed_at: string | null;
  buyer: {
    id: number;
    name: string;
    email: string;
    mobile: string | null;
  } | null;
  payment_method: string | null;
  shipping_address: string | null;
  tracking_number: string | null;
  courier: {
    name: string | null;
    tracking: string | null;
    driver: string | null;
    status: string | null;
  } | null;
  items: Array<{
    id: number;
    product_name: string;
    variant_name: string | null;
    sku: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    image: string | null;
  }>;
};

export type SellerCustomer = {
  id: number;
  name: string;
  email: string;
  mobile: string | null;
  location: string | null;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  last_order_number: string | null;
  last_order_product: string | null;
  joined_at: string | null;
  rating: number | null;
};

export type SellerPromotion = {
  id: number;
  code: string;
  type: string;
  value: number;
  min_order: number | null;
  usage_count: number;
  usage_limit: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  applies_to: string;
  category: { id: number; name: string; slug: string } | null;
  new_customers_only: boolean;
};

export type SellerDashboard = {
  seller: SellerProfile | null;
  summary: {
    total_products: number;
    active_products: number;
    draft_products: number;
    archived_products: number;
    low_stock_products: number;
    out_of_stock_products: number;
    pending_orders: number;
    processing_orders: number;
    shipped_orders: number;
    completed_orders: number;
    cancelled_orders: number;
    total_sales: number;
    pending_sales: number;
    orders_count: number;
    promotions_count: number;
    recent_activity: unknown[];
  };
  recent_orders: SellerOrder[];
  recent_products: SellerProduct[];
  top_products: Array<{
    name: string;
    category: string;
    revenue: number;
    orders: number;
    returns: number;
    image: string;
  }>;
  revenue_series: Array<{ date: string; label: string; value: number }>;
  order_series: Array<{ date: string; label: string; value: number }>;
  category_breakdown: Array<{ name: string; revenue: number; pct: number }>;
};

export async function fetchSellerDashboard() {
  return apiFetch<{ data: SellerDashboard }>("/seller/dashboard");
}

export async function fetchSellerProfile() {
  return apiFetch<{ data: SellerProfile | null }>("/seller/me");
}

export async function fetchSellerProducts() {
  return apiFetch<{ data: SellerProduct[] }>("/seller/products");
}

export async function fetchSellerOrders() {
  return apiFetch<{ data: SellerOrder[] }>("/seller/orders");
}

export async function fetchSellerCustomers() {
  return apiFetch<{ data: SellerCustomer[] }>("/seller/customers");
}

export async function fetchSellerPromotions() {
  return apiFetch<{ data: SellerPromotion[] }>("/seller/promotions");
}
