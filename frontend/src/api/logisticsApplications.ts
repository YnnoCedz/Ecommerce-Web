import { apiFetch } from "./client"

export type LogisticsApplicationDocument = {
  id: number
  document_type: "applicant_id" | "business_permit"
  original_filename: string
  mime_type: string
  file_size: number
  status: string
}

export type LogisticsApplication = {
  id: number
  reference: string
  status: "pending" | "approved" | "rejected"
  company_name: string
  legal_name: string | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
  submitted_at: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  provider_id: number | null
  applicant: { id: number; name: string; email: string } | null
  address: {
    line1: string | null
    line2: string | null
    region: string | null
    province: string | null
    city: string | null
    barangay: string | null
    postal_code: string | null
  }
  documents: LogisticsApplicationDocument[]
}

function query(params: { status?: string; search?: string }) {
  const values = new URLSearchParams()
  if (params.status) values.set("status", params.status)
  if (params.search) values.set("search", params.search)
  return values.size ? `?${values.toString()}` : ""
}

export const fetchLogisticsApplications = (params: { status?: string; search?: string } = {}) =>
  apiFetch<{ data: LogisticsApplication[]; meta: { total: number } }>(`/admin/logistics-applications${query(params)}`)

export const fetchLogisticsApplication = (id: number) =>
  apiFetch<{ data: LogisticsApplication }>(`/admin/logistics-applications/${id}`)

export const approveLogisticsApplication = (id: number) =>
  apiFetch<{ message: string; data: LogisticsApplication }>(`/admin/logistics-applications/${id}/approve`, { method: "POST" })

export const rejectLogisticsApplication = (id: number, reason: string) =>
  apiFetch<{ message: string; data: LogisticsApplication }>(`/admin/logistics-applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })

export const viewLogisticsDocument = (id: number) =>
  apiFetch<{ data: { temporary_url: string } }>(`/admin/logistics-documents/${id}/view`)
