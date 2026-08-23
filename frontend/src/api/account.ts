import { apiFetch } from "./client";

export type AccountPreferences = {
  language: "en-PH" | "fil-PH" | "ceb-PH";
  currency: "PHP";
  number_format: "1,000.00" | "1.000,00";
  recommendations_enabled: boolean;
  recently_viewed_enabled: boolean;
  price_drop_alerts_enabled: boolean;
  analytics_cookies_enabled: boolean;
  marketing_cookies_enabled: boolean;
};

export type ConversationSummary = {
  id: number;
  subject: string | null;
  order_id: number | null;
  order_number: string | null;
  product_id: number | null;
  seller_order_id: number | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  participant: { id: number; name: string; role: string } | null;
};

export type ConversationMessage = {
  id: number;
  conversation_id: number;
  body: string;
  status: string;
  is_system: boolean;
  sent_at: string | null;
  is_mine: boolean;
  sender: { id: number; name: string; role: string } | null;
  attachments: Array<{ id: number; name: string; mime_type: string | null; file_size: number; kind: string | null; url: string }>;
};

export type ConversationDetail = ConversationSummary & { messages: ConversationMessage[] };

export type BuyerReview = {
  id: number;
  order_item_id: number;
  order_id: number;
  product_id: number;
  product_name: string | null;
  product_slug: string | null;
  product_image: string | null;
  seller_name: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  verified_purchase: boolean;
  submitted_at: string | null;
  updated_at: string | null;
};

export type ReviewEligibility = {
  order_item_id: number;
  order_number: string | null;
  product_id: number;
  product_name: string;
  product_slug: string | null;
  product_image: string | null;
  seller_name: string;
};

export function updateAccountProfile(payload: {
  first_name: string;
  last_name: string;
  phone: string;
  avatar_file?: File | null;
  remove_avatar?: boolean;
}) {
  if (payload.avatar_file || payload.remove_avatar) {
    const form = new FormData();
    form.set("_method", "PATCH");
    form.set("first_name", payload.first_name);
    form.set("last_name", payload.last_name);
    form.set("phone", payload.phone);
    if (payload.avatar_file) form.set("avatar_file", payload.avatar_file);
    if (payload.remove_avatar) form.set("remove_avatar", "1");

    return apiFetch<{ message: string }>("/account/profile", {
      method: "POST",
      body: form,
    });
  }

  return apiFetch<{ message: string }>("/account/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchAccountPreferences() {
  return apiFetch<{ data: AccountPreferences }>("/account/preferences");
}

export function updateAccountPreferences(payload: AccountPreferences) {
  return apiFetch<{ message: string; data: AccountPreferences }>("/account/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchConversations() {
  return apiFetch<{ data: ConversationSummary[] }>("/messages");
}

export function fetchConversation(id: number) {
  return apiFetch<{ data: ConversationDetail }>(`/messages/${id}`);
}

export function sendConversationMessage(id: number, body: string, attachments: File[] = []) {
  if (attachments.length > 0) {
    const form = new FormData();
    form.set("body", body);
    attachments.forEach((file) => form.append("attachments[]", file));
    return apiFetch<{ message: string; data: ConversationMessage }>(`/messages/${id}`, { method: "POST", body: form });
  }
  return apiFetch<{ message: string; data: ConversationMessage }>(`/messages/${id}`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function startConversation(payload: { seller_id: number; product_id?: number; order_id?: number; seller_order_id?: number; subject?: string }) {
  return apiFetch<{ message: string; data: ConversationSummary }>("/messages/conversations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function markConversationRead(id: number) {
  return apiFetch<{ message: string }>(`/messages/${id}/read`, { method: "PATCH" });
}

export function fetchReviews() {
  return apiFetch<{ data: BuyerReview[] }>("/reviews");
}

export function fetchEligibleReviews() {
  return apiFetch<{ data: ReviewEligibility[] }>("/reviews/eligible");
}

export function createReview(payload: { order_item_id: number; rating: number; title: string; body: string }) {
  return apiFetch<{ message: string; data: BuyerReview }>("/reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateReview(id: number, payload: { rating: number; title: string; body: string }) {
  return apiFetch<{ message: string; data: BuyerReview }>(`/reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteReview(id: number) {
  return apiFetch<{ message: string }>(`/reviews/${id}`, { method: "DELETE" });
}
