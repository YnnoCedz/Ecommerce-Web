import { apiDownload, apiFetch } from "./client"
import { singleFlight } from "./requestCache"

export type SellerProfile = {
  id: number
  slug: string
  business_name: string
  trade_name: string | null
  tagline: string | null
  description: string | null
  contact_email: string | null
  public_email: string | null
  contact_phone: string | null
  messaging_phone: string | null
  logo_path: string | null
  logo_url: string | null
  banner_path: string | null
  banner_url: string | null
  status: string
  verified: boolean
  address_line1: string | null
  address_line2: string | null
  region: string | null
  region_code: string | null
  province: string | null
  province_code: string | null
  city: string | null
  city_code: string | null
  barangay: string | null
  barangay_code: string | null
  postal_code: string | null
  owner_id_number: string | null
  tin: string | null
  registration_number: string | null
  established_on: string | null
  bank_name: string | null
  bank_account_number: string | null
  gcash_number: string | null
  maya_number: string | null
  account_name: string | null
  account_number_last4: string | null
  payout_method: string | null
  payout_schedule: string | null
  operating_hours: Array<{ day?: string | null; hours?: string | null }>
  account_type: string | null
  return_policy: string | null
  shipping_policy: string | null
  privacy_policy: string | null
  categories: Array<{ id: number; name: string; slug: string }>
}

export type SellerProduct = {
  id: number
  name: string
  slug: string
  sku: string | null
  status: string
  description: string | null
  tags: string[]
  price: number
  sale_price: number | null
  cost_price: number | null
  stock_quantity: number
  low_stock_threshold: number
  track_inventory: boolean
  free_shipping: boolean
  delivery_type: string | null
  barcode: string | null
  weight_grams: number | null
  dimensions: {
    length_cm: number | null
    width_cm: number | null
    height_cm: number | null
  }
  category: { id: number; name: string; slug: string } | null
  image: string
  images: Array<{
    id: number
    url: string
    alt: string
    sort_order: number
    is_primary: boolean
  }>
  variants: Array<{
    id: number
    name: string
    sku: string | null
    barcode: string | null
    options: string[]
    option_values: Array<{ name: string; value: string }>
    price_override: number | null
    sale_price_override: number | null
    stock_quantity: number
    low_stock_threshold: number
    active: boolean
  }>
  created_at: string | null
  published_at: string | null
}

export type SellerProductVariantDraft = {
  server_id?: number
  name: string
  sku?: string | null
  barcode?: string | null
  options: string[]
  option_values: Array<{ name: string; value: string }>
  price_override?: number | null
  sale_price_override?: number | null
  stock_quantity?: number
  low_stock_threshold?: number
  active?: boolean
}

export type SellerProductSubmission = {
  name: string
  description?: string | null
  category_id: number
  tags: string[]
  sku: string
  barcode?: string | null
  price: number
  sale_price?: number | null
  cost_price?: number | null
  status: "draft" | "active" | "archived"
  delivery_type: string
  track_inventory: boolean
  stock_quantity: number
  low_stock_threshold?: number
  weight_grams?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  free_shipping: boolean
  variants: SellerProductVariantDraft[]
  keep_image_ids?: number[]
  image_files?: File[]
}

export function buildSellerProductFormData(
  payload: SellerProductSubmission,
): FormData {
  const formData = new FormData()

  formData.set("name", payload.name)
  if (payload.description !== undefined && payload.description !== null)
    formData.set("description", payload.description)
  formData.set("category_id", String(payload.category_id))
  formData.set("tags", JSON.stringify(payload.tags ?? []))
  formData.set("sku", payload.sku)
  if (payload.barcode !== undefined && payload.barcode !== null)
    formData.set("barcode", payload.barcode)
  formData.set("price", String(payload.price))
  if (payload.sale_price !== undefined && payload.sale_price !== null)
    formData.set("sale_price", String(payload.sale_price))
  if (payload.cost_price !== undefined && payload.cost_price !== null)
    formData.set("cost_price", String(payload.cost_price))
  formData.set("status", payload.status)
  formData.set("delivery_type", payload.delivery_type)
  formData.set("track_inventory", payload.track_inventory ? "1" : "0")
  formData.set("stock_quantity", String(payload.stock_quantity))
  formData.set("low_stock_threshold", String(payload.low_stock_threshold ?? 0))
  if (payload.weight_grams !== undefined && payload.weight_grams !== null)
    formData.set("weight_grams", String(payload.weight_grams))
  if (payload.length_cm !== undefined && payload.length_cm !== null)
    formData.set("length_cm", String(payload.length_cm))
  if (payload.width_cm !== undefined && payload.width_cm !== null)
    formData.set("width_cm", String(payload.width_cm))
  if (payload.height_cm !== undefined && payload.height_cm !== null)
    formData.set("height_cm", String(payload.height_cm))
  formData.set("free_shipping", payload.free_shipping ? "1" : "0")
  formData.set("variants", JSON.stringify(payload.variants ?? []))
  formData.set("keep_image_ids", JSON.stringify(payload.keep_image_ids ?? []))

  ;(payload.image_files ?? []).forEach((file) => {
    formData.append("images[]", file)
  })

  return formData
}

export type SellerOrder = {
  id: number
  order_id: number
  order_number: string | null
  status: string
  subtotal: number
  shipping_fee: number
  discount_total: number
  grand_total: number
  confirmed_at: string | null
  ready_at: string | null
  picked_up_at: string | null
  delivered_at: string | null
  completed_at: string | null
  next_status: "confirmed" | "preparing" | "ready" | null
  placed_at: string | null
  buyer: {
    id: number
    name: string
    email: string
    mobile: string | null
  } | null
  payment_method: string | null
  shipping_address: string | null
  tracking_number: string | null
  courier: {
    name: string | null
    tracking: string | null
    driver: string | null
    status: string | null
    events: Array<{
      status: string
      note: string | null
      occurred_at: string | null
    }>
  } | null
  items: Array<{
    id: number
    product_id: number
    product_name: string
    variant_name: string | null
    sku: string | null
    quantity: number
    unit_price: number
    subtotal: number
    image: string | null
  }>
}

export type SellerCustomer = {
  id: number
  name: string
  email: string
  mobile: string | null
  location: string | null
  total_orders: number
  total_spent: number
  last_order_date: string | null
  last_order_number: string | null
  last_order_product: string | null
  joined_at: string | null
  rating: number | null
}

export type SellerPromotion = {
  id: number
  code: string
  type: string
  value: number
  min_order: number | null
  usage_count: number
  usage_limit: number | null
  start_date: string | null
  end_date: string | null
  status: string
  applies_to: string
  category: { id: number; name: string; slug: string } | null
  new_customers_only: boolean
  kind?: string
  name?: string
  deal_price?: number | null
  regular_price?: number | null
  sale_price?: number | null
  promotion_price?: number | null
  variant_pricing?: "percentage-applied-per-variant" | "product-price"
  starts_at?: string | null
  ends_at?: string | null
  product?: { id: number; name: string; slug: string } | null
}

export type SellerReview = {
  id: number
  product_id: number
  product_name: string
  product_image: string | null
  buyer_name: string
  rating: number
  title: string | null
  body: string | null
  status: string
  verified_purchase: boolean
  submitted_at: string | null
  reply: { id: number; body: string; replied_at: string | null } | null
}

export type SellerReturnRequest = {
  id: number
  order_number: string
  seller_order_id: number
  buyer_name: string
  status: string
  reason: string
  buyer_statement: string | null
  seller_response: string | null
  requested_amount: number
  refunded_amount: number
  requested_at: string | null
  items: Array<{
    id: number
    product_name: string
    quantity: number
    unit_price: number
    refund_amount: number
  }>
  evidence: Array<{
    id: number
    name: string
    mime_type: string | null
    url: string
  }>
  dispute: { id: number; status: string; reason: string } | null
}

export type SellerDashboard = {
  seller: SellerProfile | null
  summary: {
    total_products: number
    active_products: number
    draft_products: number
    archived_products: number
    low_stock_products: number
    out_of_stock_products: number
    pending_orders: number
    processing_orders: number
    shipped_orders: number
    completed_orders: number
    cancelled_orders: number
    total_sales: number
    pending_sales: number
    orders_count: number
    promotions_count: number
    recent_activity: unknown[]
  }
  recent_orders: SellerOrder[]
  recent_products: SellerProduct[]
  top_products: Array<{
    name: string
    category: string
    revenue: number
    orders: number
    returns: number
    image: string
  }>
  revenue_series: Array<{ date: string; label: string; value: number }>
  order_series: Array<{ date: string; label: string; value: number }>
  category_breakdown: Array<{ name: string; revenue: number; pct: number }>
  sales_summary: {
    total_orders: number
    total_units_sold: number
    gross_product_sales: number
    discounts: number
    refunds: number
    shipping_collected: number
    net_product_sales: number
    average_order_value: number
  }
  reporting_period: { from: string; to: string; label: string }
}

export async function fetchSellerDashboard(range: 7 | 30 | 90 = 30) {
  return singleFlight(`seller:dashboard:${range}`, () =>
    apiFetch<{ data: SellerDashboard }>(`/seller/dashboard?range=${range}`),
  )
}

export function exportSellerSalesReport(input: {
  from: string
  to: string
  format: "xlsx" | "pdf"
}) {
  const query = new URLSearchParams(input)
  return apiDownload(`/seller/reports/sales/export?${query.toString()}`)
}

export async function fetchSellerProfile() {
  return singleFlight("seller:me", () =>
    apiFetch<{ data: SellerProfile | null }>("/seller/me"),
  )
}

export type SellerProductsMeta = {
  current_page: number
  per_page: number
  last_page: number
  total: number
  from: number | null
  to: number | null
  counts: Record<"all" | "in-stock" | "low-stock" | "out-of-stock", number>
}

export async function fetchSellerProducts(params?: {
  page?: number
  per_page?: number
  search?: string
  stock_status?: string
}) {
  const query = new URLSearchParams()
  if (params?.page) query.set("page", String(params.page))
  if (params?.per_page) query.set("per_page", String(params.per_page))
  if (params?.search) query.set("search", params.search)
  if (params?.stock_status && params.stock_status !== "all")
    query.set("stock_status", params.stock_status)
  const suffix = query.toString() ? `?${query.toString()}` : ""
  return singleFlight(`seller:products:${suffix}`, () =>
    apiFetch<{ data: SellerProduct[]; meta?: SellerProductsMeta }>(
      `/seller/products${suffix}`,
    ),
  )
}

export async function fetchSellerProduct(productId: number) {
  return apiFetch<{ data: SellerProduct }>(`/seller/products/${productId}`)
}

export async function fetchSellerOrders() {
  return singleFlight("seller:orders", () =>
    apiFetch<{ data: SellerOrder[] }>("/seller/orders"),
  )
}

export async function updateSellerOrderStatus(
  sellerOrderId: number,
  status: NonNullable<SellerOrder["next_status"]>,
  trackingNumber?: string,
) {
  return apiFetch<{ message: string; data: SellerOrder }>(
    `/seller/orders/${sellerOrderId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, tracking_number: trackingNumber || null }),
    },
  )
}

export function cancelSellerOrderBySeller(
  sellerOrderId: number,
  reason: string,
) {
  return apiFetch<{ message: string }>(
    `/seller/orders/${sellerOrderId}/cancel`,
    { method: "POST", body: JSON.stringify({ reason }) },
  )
}

export async function fetchSellerCustomers() {
  return singleFlight("seller:customers", () =>
    apiFetch<{ data: SellerCustomer[] }>("/seller/customers"),
  )
}

export async function fetchSellerPromotions() {
  return singleFlight("seller:promotions", () =>
    apiFetch<{ data: SellerPromotion[]; server_time: string }>(
      "/seller/promotions",
    ),
  )
}

export type TimedPromotionPayload = {
  product_id: number
  name: string
  type: "fixed-price" | "percentage"
  value: number
  deal_price?: number | null
  starts_at: string
  ends_at: string
}

export function createSellerPromotion(payload: TimedPromotionPayload) {
  return apiFetch<{ message: string; data: SellerPromotion }>(
    "/seller/promotions",
    { method: "POST", body: JSON.stringify(payload) },
  )
}

export function updateSellerPromotion(
  id: number,
  payload: TimedPromotionPayload,
) {
  return apiFetch<{ message: string; data: SellerPromotion }>(
    `/seller/promotions/${id}`,
    { method: "PUT", body: JSON.stringify(payload) },
  )
}

export function cancelSellerPromotion(id: number) {
  return apiFetch<{ message: string; data: SellerPromotion }>(
    `/seller/promotions/${id}/cancel`,
    { method: "PATCH" },
  )
}

export function fetchSellerReviews() {
  return apiFetch<{ data: SellerReview[] }>("/seller/reviews")
}

export function saveSellerReviewReply(reviewId: number, body: string) {
  return apiFetch<{ message: string }>(`/seller/reviews/${reviewId}/reply`, {
    method: "POST",
    body: JSON.stringify({ body }),
  })
}

export function deleteSellerReviewReply(reviewId: number) {
  return apiFetch<{ message: string }>(`/seller/reviews/${reviewId}/reply`, {
    method: "DELETE",
  })
}

export function fetchSellerReturns() {
  return apiFetch<{ data: SellerReturnRequest[] }>("/seller/returns")
}

export function updateSellerReturn(
  returnId: number,
  status: string,
  seller_response?: string,
) {
  return apiFetch<{ message: string; data: SellerReturnRequest }>(
    `/seller/returns/${returnId}`,
    { method: "PATCH", body: JSON.stringify({ status, seller_response }) },
  )
}

export type SellerProfileUpdatePayload = {
  business_name: string
  slug?: string | null
  trade_name?: string | null
  tagline?: string | null
  description?: string | null
  contact_email?: string | null
  public_email?: string | null
  contact_phone?: string | null
  messaging_phone?: string | null
  address_line1?: string | null
  address_line2?: string | null
  region_code?: string | null
  province_code?: string | null
  city_code?: string | null
  barangay_code?: string | null
  province?: string | null
  city?: string | null
  postal_code?: string | null
  payout_method?: string | null
  payout_schedule?: string | null
  bank_name?: string | null
  account_type?: string | null
  bank_account_number?: string | null
  gcash_number?: string | null
  maya_number?: string | null
  account_name?: string | null
  operating_hours?: Array<{ day: string; hours: string }>
  return_policy?: string | null
  shipping_policy?: string | null
  privacy_policy?: string | null
  logo_file?: File | null
  banner_file?: File | null
  remove_logo?: boolean
  remove_banner?: boolean
}

export async function updateSellerProfile(payload: SellerProfileUpdatePayload) {
  const hasFiles =
    (typeof File !== "undefined" && payload.logo_file instanceof File) ||
    (typeof File !== "undefined" && payload.banner_file instanceof File) ||
    Boolean(payload.remove_logo) ||
    Boolean(payload.remove_banner)

  if (!hasFiles) {
    return apiFetch<{ message: string; data: SellerProfile }>("/seller/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  }

  const formData = new FormData()
  // PHP does not reliably parse multipart file fields on PATCH requests.
  // Use Laravel method spoofing so uploaded branding files reach the controller.
  formData.set("_method", "PATCH")
  formData.set("business_name", payload.business_name)
  if (payload.slug !== undefined) formData.set("slug", payload.slug ?? "")
  if (payload.trade_name !== undefined)
    formData.set("trade_name", payload.trade_name ?? "")
  if (payload.tagline !== undefined)
    formData.set("tagline", payload.tagline ?? "")
  if (payload.description !== undefined)
    formData.set("description", payload.description ?? "")
  if (payload.contact_email !== undefined)
    formData.set("contact_email", payload.contact_email ?? "")
  if (payload.public_email !== undefined)
    formData.set("public_email", payload.public_email ?? "")
  if (payload.contact_phone !== undefined)
    formData.set("contact_phone", payload.contact_phone ?? "")
  if (payload.messaging_phone !== undefined)
    formData.set("messaging_phone", payload.messaging_phone ?? "")
  if (payload.address_line1 !== undefined)
    formData.set("address_line1", payload.address_line1 ?? "")
  if (payload.address_line2 !== undefined)
    formData.set("address_line2", payload.address_line2 ?? "")
  if (payload.region_code !== undefined)
    formData.set("region_code", payload.region_code ?? "")
  if (payload.province_code !== undefined)
    formData.set("province_code", payload.province_code ?? "")
  if (payload.city_code !== undefined)
    formData.set("city_code", payload.city_code ?? "")
  if (payload.barangay_code !== undefined)
    formData.set("barangay_code", payload.barangay_code ?? "")
  if (payload.province !== undefined)
    formData.set("province", payload.province ?? "")
  if (payload.city !== undefined) formData.set("city", payload.city ?? "")
  if (payload.postal_code !== undefined)
    formData.set("postal_code", payload.postal_code ?? "")
  if (payload.payout_method !== undefined)
    formData.set("payout_method", payload.payout_method ?? "")
  if (payload.payout_schedule !== undefined)
    formData.set("payout_schedule", payload.payout_schedule ?? "")
  if (payload.bank_name !== undefined)
    formData.set("bank_name", payload.bank_name ?? "")
  if (payload.account_type !== undefined)
    formData.set("account_type", payload.account_type ?? "")
  if (payload.bank_account_number !== undefined)
    formData.set("bank_account_number", payload.bank_account_number ?? "")
  if (payload.gcash_number !== undefined)
    formData.set("gcash_number", payload.gcash_number ?? "")
  if (payload.maya_number !== undefined)
    formData.set("maya_number", payload.maya_number ?? "")
  if (payload.account_name !== undefined)
    formData.set("account_name", payload.account_name ?? "")
  if (payload.operating_hours !== undefined)
    formData.set(
      "operating_hours",
      JSON.stringify(payload.operating_hours ?? []),
    )
  if (payload.return_policy !== undefined)
    formData.set("return_policy", payload.return_policy ?? "")
  if (payload.shipping_policy !== undefined)
    formData.set("shipping_policy", payload.shipping_policy ?? "")
  if (payload.privacy_policy !== undefined)
    formData.set("privacy_policy", payload.privacy_policy ?? "")
  if (typeof File !== "undefined" && payload.logo_file instanceof File)
    formData.set("logo_file", payload.logo_file)
  if (typeof File !== "undefined" && payload.banner_file instanceof File)
    formData.set("banner_file", payload.banner_file)
  if (payload.remove_logo) formData.set("remove_logo", "1")
  if (payload.remove_banner) formData.set("remove_banner", "1")

  return apiFetch<{ message: string; data: SellerProfile }>("/seller/me", {
    method: "POST",
    body: formData,
  })
}

export async function createSellerProduct(payload: SellerProductSubmission) {
  return apiFetch<{ message: string; data: SellerProduct }>("/seller/products", {
    method: "POST",
    body: buildSellerProductFormData(payload),
  })
}

export async function updateSellerProduct(
  productId: number,
  payload: SellerProductSubmission,
) {
  const formData = buildSellerProductFormData(payload)
  // PHP parses multipart form fields on POST. Let Laravel route this request to
  // the PATCH endpoint after PHP has populated the request body.
  formData.set("_method", "PATCH")

  return apiFetch<{ message: string; data: SellerProduct }>(
    `/seller/products/${productId}`,
    {
      method: "POST",
      body: formData,
    },
  )
}

export async function deleteSellerProduct(productId: number) {
  return apiFetch<{ message: string }>(`/seller/products/${productId}`, {
    method: "DELETE",
  })
}

export async function updateSellerInventory(
  productId: number,
  payload: {
    quantity: number
    variant_id?: number | null
    low_stock_threshold?: number | null
  },
) {
  return apiFetch<{
    message: string
    data: {
      product_id: number
      variant_id: number | null
      quantity: number
      low_stock_threshold: number
    }
  }>(`/seller/products/${productId}/inventory`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}
