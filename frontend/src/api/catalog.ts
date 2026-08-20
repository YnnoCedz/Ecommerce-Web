import { apiFetch } from "./client";
import { singleFlight } from "./requestCache";

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
  follower_count: number;
  response_rate: number;
  response_time: string;
  joined_year: number;
  verified: boolean;
  banner: string;
  location: string;
  description: string | null;
  products: CatalogProduct[];
};

export type CatalogProduct = {
  id: number;
  slug: string;
  name: string;
  seller_slug: string | null;
  seller: string;
  category_slug: string | null;
  category: string;
  price: number;
  original_price: number | null;
  rating: number;
  rating_count: number;
  sold_count: number;
  image: string;
  badge: string | null;
  in_stock: boolean;
  free_shipping: boolean;
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
    stock_quantity: number;
    active: boolean;
    options: string[];
  }>;
  related?: CatalogProduct[];
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
  return singleFlight("catalog:categories", () => apiFetch<{ data: CatalogCategory[] }>("/categories"));
}

export async function fetchCatalogProducts(params?: { search?: string; category?: string; seller?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.seller) searchParams.set("seller", params.seller);
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiFetch<{ data: CatalogProduct[] }>(`/products${suffix}`);
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
  return apiFetch<{ data: CatalogProduct }>(`/products/${encodeURIComponent(slug)}`);
}

export async function fetchCatalogSellers() {
  return apiFetch<{ data: CatalogSeller[] }>("/sellers");
}

export async function fetchCatalogSeller(slug: string) {
  return apiFetch<{ data: CatalogSeller }>(`/sellers/${encodeURIComponent(slug)}`);
}
