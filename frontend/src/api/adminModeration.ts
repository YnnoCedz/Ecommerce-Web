import { apiFetch } from "./client";

export type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";
export type ReportTargetType = "seller" | "buyer" | "courier" | "product" | "conversation";

export type AdminReport = {
  id: number;
  reference: string;
  status: ReportStatus;
  reason: string;
  description: string | null;
  severity: "low" | "medium" | "high" | "critical";
  target_type: ReportTargetType;
  target_id: number;
  target_name: string;
  reporter: { id: number; name: string; email: string } | null;
  attachment_count: number;
  attachments?: Array<{ id: number; name: string; mime_type: string | null; file_size: number | null; url: string }>;
  moderation_notes: string | null;
  resolved_by: { id: number; name: string } | null;
  submitted_at: string | null;
  resolved_at: string | null;
  created_at: string | null;
};

export type AdminReportResponse = {
  data: AdminReport[];
  meta: { total_count: number; pending_count: number; reviewing_count: number; critical_pending_count: number };
};

export type DisputeSummary = {
  id: number;
  reference: string;
  status: string;
  reason: string;
  order_number: string | null;
  return_request_id: number;
  buyer_name: string | null;
  seller_name: string | null;
  requested_amount: number;
  refund_amount: number;
  resolution_type: string | null;
  opened_at: string | null;
  resolved_at: string | null;
};

export type DisputeDetail = DisputeSummary & {
  buyer_statement: string | null;
  seller_response: string | null;
  resolution_notes: string | null;
  resolved_by: { id: number; name: string } | null;
  buyer: { id: number; name: string; email: string };
  seller: { id: number; name: string; email: string | null };
  order: { id: number; order_number: string; status: string; payment_status: string; payment_method: string | null; grand_total: number; placed_at: string | null };
  seller_order: { id: number; status: string; grand_total: number };
  return_request: { id: number; status: string; reason: string; buyer_statement: string | null; seller_response: string | null; requested_amount: number; refunded_amount: number; requested_at: string | null; resolved_at: string | null };
  items: Array<{ id: number; order_item_id: number; product_name: string | null; sku: string | null; quantity: number; unit_price: number; refund_amount: number }>;
  evidence: Array<{ id: number; name: string; mime_type: string | null; file_size: number | null; uploaded_by: string | null; created_at: string | null; url: string }>;
  payments: Array<{ id: number; parent_payment_id: number | null; type: string; method: string; provider: string | null; status: string; amount: number; refunded_amount: number; currency: string; reference: string | null; occurred_at: string | null }>;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminDisputeResponse = {
  data: DisputeSummary[];
  meta: { total_count: number; open_count: number; resolved_count: number };
};

export function submitReport(payload: {
  target_type: ReportTargetType;
  target_id: number;
  reason: string;
  description: string;
  attachments?: File[];
}) {
  const body = new FormData();
  body.append("target_type", payload.target_type);
  body.append("target_id", String(payload.target_id));
  body.append("reason", payload.reason);
  body.append("description", payload.description);
  payload.attachments?.forEach((file) => body.append("attachments[]", file));

  return apiFetch<{ message: string; data: AdminReport }>("/reports", { method: "POST", body });
}

export function fetchAdminReports() {
  return apiFetch<AdminReportResponse>("/admin/reports");
}

export function fetchAdminReport(id: number) {
  return apiFetch<{ data: AdminReport }>(`/admin/reports/${id}`);
}

export function updateAdminReport(id: number, payload: { status: ReportStatus; moderation_notes?: string }) {
  return apiFetch<{ message: string; data: AdminReport }>(`/admin/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminDisputes() {
  return apiFetch<AdminDisputeResponse>("/admin/disputes");
}

export function fetchAdminDispute(id: number) {
  return apiFetch<{ data: DisputeDetail }>(`/admin/disputes/${id}`);
}

export function resolveAdminDispute(id: number, payload: { resolution_type: string; resolution_notes: string; refund_amount?: number }) {
  return apiFetch<{ message: string; data: DisputeDetail }>(`/admin/disputes/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
