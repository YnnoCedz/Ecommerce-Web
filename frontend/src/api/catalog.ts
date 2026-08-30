import { apiFetch } from "./client";
import { cachedSingleFlight, singleFlight } from "./requestCache";

export type CatalogCategory = {
  id: number;
  slug: string;
  label: string;
  count: number;
  subs: string[];
};

export type CatalogSeller = {
  id: number;
  slug: string;
  name: string;
  initials: string;
  category: string;
  rating: number;
  rating_count: number;
  product_count: number;
  follower_count: number | null;
  fulfilled_order_count: number | null;
  units_sold: number | null;
  joined_year: number;
  verified: boolean;
  avatar: string | null;
  logo: string | null;
  banner: string | null;
  location: string;
  description: string | null;
  products: CatalogProduct[];
};

export type CatalogProduct = {
  id: number;
  slug: string;
  name: string;
  seller_slug: string | null;
  seller: string | CatalogSeller;
  category_slug: string | null;
  category: string | CatalogCategory;
  price: number;
  regular_price: number;
  sale_price: number | null;
  promotion_price: number | null;
  original_price: number | null;
  discount_amount: number;
  discount_percentage: number;
  pricing_source: "regular" | "sale" | "promotion";
  rating: number;
  rating_count: number;
  sold_count: number;
  image: string;
  badge: string | null;
  in_stock: boolean;
  free_shipping: boolean;
  is_deal?: boolean;
  promotion?: {
    id: number;
    name: string | null;
    type: "fixed-price" | "percentage";
    value: number;
    deal_price: number | null;
    promotion_price: number;
    original_price: number | null;
    discount_amount: number;
    discount_percentage: number;
    starts_at: string;
    ends_at: string;
  } | null;
  description?: string | null;
  sku?: string;
  barcode?: string | null;
  stock_quantity?: number;
  track_inventory?: boolean;
  weight_grams?: number | null;
  dimensions?: {
    length_cm?: number | null;
    width_cm?: number | null;
    height_cm?: number | null;
  };
  seller_details?: CatalogSeller;
  category_details?: CatalogCategory;
  images?: Array<{
    id: number;
    url: string;
    alt: string;
    sort_order: number;
    is_primary: boolean;
  }>;
  variants?: Array<{
    id: number;
    name: string;
    sku: string | null;
    price: number;
    regular_price: number;
    sale_price: number | null;
    promotion_price: number | null;
    original_price: number | null;
    discount_amount: number;
    discount_percentage: number;
    pricing_source: "regular" | "sale" | "promotion";
    is_deal: boolean;
    stock_quantity: number;
    active: boolean;
    options: string[];
    option_values: Array<{ name: string; value: string }>;
  }>;
  related?: CatalogProduct[];
  review_summary?: ProductReviewSummary;
  shipping_policy?: string | null;
  return_policy?: string | null;
  delivery_estimate?: string | null;
};

export type ProductReviewSummary = {
  average_rating: number;
  review_count: number;
  rating_distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
};

export type ProductReview = {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  buyer_display_name: string;
  buyer_avatar: string | null;
  verified_purchase: boolean;
  helpful_count: number;
  created_at: string | null;
  updated_at: string | null;
  images: string[];
  seller_reply: {
    body: string;
    seller_name: string | null;
    replied_at: string | null;
  } | null;
};

export type ProductReviewsResponse = {
  data: ProductReview[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type MarketplaceSearchParams = {
  q?: string;
  category?: string;
  seller?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  free_shipping?: boolean;
  sort?: string;
  page?: number;
  per_page?: number;
};

export type MarketplaceSearchResponse = {
  data: CatalogProduct[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  query: {
    original: string;
    normalized: string;
    suggested: string | null;
  };
};

export type SearchSuggestion = {
  id: number;
  type: "product";
  label: string;
  subtitle: string;
  slug: string;
  image: string | null;
};

export async function fetchCatalogCategories() {
  return cachedSingleFlight("catalog:categories", 60_000, (signal) => apiFetch<{ data: CatalogCategory[] }>("/categories", { signal }));
}

export async function fetchCatalogProducts(params?: { search?: string; category?: string; seller?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.seller) searchParams.set("seller", params.seller);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return singleFlight(`catalog:products:${suffix}`, (signal) => apiFetch<{ data: CatalogProduct[] }>(`/products${suffix}`, { signal }));
}

export async function fetchActiveDeals() {
  return apiFetch<{ data: CatalogProduct[]; server_time: string }>("/deals");
}

export async function searchMarketplace(params: MarketplaceSearchParams) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return apiFetch<MarketplaceSearchResponse>(`/search?${searchParams.toString()}`);
}

export async function fetchSearchSuggestions(query: string, limit = 6) {
  const searchParams = new URLSearchParams({ q: query, limit: String(limit) });
  return apiFetch<{ data: SearchSuggestion[] }>(`/search/suggestions?${searchParams.toString()}`);
}

export async function fetchCatalogProduct(slug: string) {
  return apiFetch<{ data: CatalogProduct; server_time: string }>(`/products/${encodeURIComponent(slug)}`);
}

export async function fetchProductReviews(slug: string, page = 1, perPage = 10) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage), sort: "newest" });
  return apiFetch<ProductReviewsResponse>(`/products/${encodeURIComponent(slug)}/reviews?${params.toString()}`);
}

export async function fetchCatalogSellers() {
  return singleFlight("catalog:sellers", (signal) => apiFetch<{ data: CatalogSeller[] }>("/sellers", { signal }));
}

export async function fetchCatalogSeller(slug: string) {
  return apiFetch<{ data: CatalogSeller }>(`/sellers/${encodeURIComponent(slug)}`);
}
