import { apiFetch } from "./client"

export type CourierDocument = {
  id: number
  document_type: "driver_license" | "vehicle_or" | "vehicle_cr"
  original_filename: string
  mime_type: string
  file_size: number
  status: string
  uploaded_at: string | null
}

export type CourierApplication = {
  id: number
  reference: string
  status: "draft" | "pending" | "approved" | "rejected"
  mobile: string | null
  address: {
    line1: string | null
    line2: string | null
    region: string | null
    region_code: string | null
    province: string | null
    province_code: string | null
    city: string | null
    city_code: string | null
    barangay: string | null
    barangay_code: string | null
    postal_code: string | null
  }
  vehicle: {
    type: string | null
    make: string | null
    model: string | null
    year: number | null
    plate_number: string | null
    color: string | null
  }
  submitted_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_reason: string | null
  applicant: { id: number; name: string; email: string } | null
  courier: { id: number; status: string } | null
  documents: CourierDocument[]
}

export type CourierApplicationPayload = {
  mobile: string
  address_line1: string
  address_line2?: string
  region_code: string
  province_code?: string
  city_code: string
  barangay_code: string
  postal_code: string
  vehicle_type: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number
  vehicle_plate_number: string
  vehicle_color: string
  driver_license_image: File
  vehicle_or_image: File
  vehicle_cr_image: File
}

export function fetchCurrentCourierApplication() {
  return apiFetch<{ data: CourierApplication | null; eligible: boolean }>(
    "/courier/application",
  )
}

export function submitCourierApplication(payload: CourierApplicationPayload) {
  const form = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== "") form.append(key, String(value))
  })
  form.set("driver_license_image", payload.driver_license_image)
  form.set("vehicle_or_image", payload.vehicle_or_image)
  form.set("vehicle_cr_image", payload.vehicle_cr_image)

  return apiFetch<{ message: string; data: CourierApplication }>(
    "/courier/applications",
    { method: "POST", body: form },
  )
}

export function saveCourierApplicationDraft(payload: Partial<Omit<CourierApplicationPayload, DocumentKey>>) {
  return apiFetch<{ message: string; data: CourierApplication }>(
    "/courier/application/draft",
    { method: "PUT", body: JSON.stringify(payload) },
  )
}

type DocumentKey = "driver_license_image" | "vehicle_or_image" | "vehicle_cr_image"

export function fetchCourierApplications(params: {
  status?: string
  search?: string
  per_page?: number
} = {}) {
  const query = new URLSearchParams()
  if (params.status) query.set("status", params.status)
  if (params.search) query.set("search", params.search)
  if (params.per_page) query.set("per_page", String(params.per_page))
  const suffix = query.toString() ? `?${query.toString()}` : ""
  return apiFetch<{ data: CourierApplication[]; total: number }>(
    `/admin/courier-applications${suffix}`,
  )
}

export function fetchCourierApplication(id: number) {
  return apiFetch<{ data: CourierApplication }>(
    `/admin/courier-applications/${id}`,
  )
}

export function viewCourierDocument(id: number) {
  return apiFetch<{ data: { temporary_url: string } }>(
    `/admin/courier-documents/${id}/view`,
  )
}
