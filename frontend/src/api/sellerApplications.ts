import { apiFetch } from "./client"
import { singleFlight } from "./requestCache"

export type SellerApplicationDocument = {
  id: number
  document_type: string
  storage_disk: string | null
  file_name: string
  original_filename: string | null
  mime_type: string | null
  file_size: number | null
  status: string
  private: boolean
  uploaded_at: string | null
}

export type SellerApplicationSummary = {
  id: number
  slug: string
  business_name: string
  trade_name: string | null
  tagline: string | null
  description: string | null
  owner_id_number: string | null
  tin: string | null
  registration_number: string | null
  established_on: string | null
  address_line1: string
  address_line2: string | null
  region: string | null
  region_code: string
  province: string | null
  province_code?: string | null
  city: string
  city_code: string
  barangay: string | null
  barangay_code: string
  postal_code: string
  contact_name: string | null
  contact_email: string | null
  public_email: string | null
  contact_phone: string | null
  messaging_phone: string | null
  status: string
  rejection_reason: string | null
  submitted_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  approved_seller_id: number | null
  applicant: {
    id: number
    name: string
    email: string
    mobile: string | null
    phone: string | null
  } | null
  approved_seller: {
    id: number
    slug: string
    status: string
  } | null
  categories: Array<{
    id: number
    name: string
    slug: string
  }>
  documents: SellerApplicationDocument[]
}

export type SellerApplicationListResponse = {
  data: SellerApplicationSummary[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

export type SellerApplicationPayload = {
  first_name: string
  last_name: string
  business_name: string
  trade_name?: string
  tagline?: string
  description: string
  owner_id_number: string
  tin: string
  registration_number: string
  established_on: string
  address_line1: string
  address_line2?: string
  region_code: string
  province_code?: string
  city_code: string
  barangay_code: string
  postal_code: string
  contact_email: string
  public_email?: string
  contact_phone: string
  messaging_phone?: string
  categories: number[]
  owner_id_file: File
  seller_certificate_file: File
  business_document_file?: File | null
}

export async function fetchCurrentSellerApplication() {
  return singleFlight("seller-application:current", () =>
    apiFetch<{ data: SellerApplicationSummary | null }>("/seller/application"),
  )
}

export async function fetchSellerApplication(id: number) {
  return singleFlight(`seller-application:${id}`, () =>
    apiFetch<{ data: SellerApplicationSummary }>(
      `/admin/seller-applications/${id}`,
    ),
  )
}

export async function submitSellerApplication(
  payload: SellerApplicationPayload,
) {
  const formData = new FormData()
  formData.append("first_name", payload.first_name)
  formData.append("last_name", payload.last_name)
  formData.append("business_name", payload.business_name)
  if (payload.trade_name) formData.append("trade_name", payload.trade_name)
  if (payload.tagline) formData.append("tagline", payload.tagline)
  formData.append("description", payload.description)
  formData.append("owner_id_number", payload.owner_id_number)
  formData.append("tin", payload.tin)
  formData.append("registration_number", payload.registration_number)
  formData.append("established_on", payload.established_on)
  formData.append("address_line1", payload.address_line1)
  if (payload.address_line2)
    formData.append("address_line2", payload.address_line2)
  formData.append("region_code", payload.region_code)
  if (payload.province_code)
    formData.append("province_code", payload.province_code)
  formData.append("city_code", payload.city_code)
  formData.append("barangay_code", payload.barangay_code)
  formData.append("postal_code", payload.postal_code)
  formData.append("contact_email", payload.contact_email)
  if (payload.public_email)
    formData.append("public_email", payload.public_email)
  formData.append("contact_phone", payload.contact_phone)
  if (payload.messaging_phone)
    formData.append("messaging_phone", payload.messaging_phone)
  payload.categories.forEach((categoryId, index) =>
    formData.append(`categories[${index}]`, String(categoryId)),
  )
  formData.append("owner_id_file", payload.owner_id_file)
  formData.append("seller_certificate_file", payload.seller_certificate_file)
  if (payload.business_document_file)
    formData.append("business_document_file", payload.business_document_file)

  return apiFetch<{ message: string application: SellerApplicationSummary }>(
    "/seller/applications",
    {
      method: "POST",
      body: formData,
    },
  )
}

export async function fetchSellerApplications(params?: {
  search?: string
  status?: string
  category_id?: number
  from?: string
  to?: string
  per_page?: number
}) {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set("search", params.search)
  if (params?.status) searchParams.set("status", params.status)
  if (typeof params?.category_id === "number")
    searchParams.set("category_id", String(params.category_id))
  if (params?.from) searchParams.set("from", params.from)
  if (params?.to) searchParams.set("to", params.to)
  if (params?.per_page) searchParams.set("per_page", String(params.per_page))
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : ""

  return singleFlight(`seller-applications:${suffix}`, () =>
    apiFetch<SellerApplicationListResponse>(
      `/admin/seller-applications${suffix}`,
    ),
  )
}

export async function approveSellerApplication(id: number) {
  return apiFetch<{ message: string data: SellerApplicationSummary }>(
    `/admin/seller-applications/${id}/approve`,
    {
      method: "POST",
    },
  )
}

export async function rejectSellerApplication(
  id: number,
  rejection_reason: string,
) {
  return apiFetch<{ message: string data: SellerApplicationSummary }>(
    `/admin/seller-applications/${id}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ rejection_reason }),
    },
  )
}

export async function requestSellerApplicationRevision(
  id: number,
  review_notes: string,
) {
  return apiFetch<{ message: string data: SellerApplicationSummary }>(
    `/admin/seller-applications/${id}/request-revision`,
    {
      method: "POST",
      body: JSON.stringify({ review_notes }),
    },
  )
}

export async function viewSellerDocument(id: number) {
  return apiFetch<{
    data: {
      id: number
      document_type: string
      file_name: string
      original_filename: string | null
      mime_type: string | null
      file_size: number | null
      private: boolean
      temporary_url: string
    }
  }>(`/admin/seller-documents/${id}/view`)
}
