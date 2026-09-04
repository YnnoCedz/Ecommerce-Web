import { apiFetch } from "./client"

export type UserRegistrationStatus =
  | "pending"
  | "approved"
  | "rejected"

export type UserRegistrationAddress = {
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

export type UserRegistrationDocument = {
  id: number
  document_type: string
  original_filename: string
  mime_type: string
  file_size: number
  status: string
  uploaded_at: string | null
}

export type UserRegistration = {
  id: number
  reference: string
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  display_name: string
  sex: string | null
  birthdate: string | null
  age: number | null
  email: string
  phone: string | null
  status: string
  registration_status: UserRegistrationStatus
  submitted_at: string | null
  reviewed_at: string | null
  reviewer: { id: number; name: string } | null
  decision_reason: string | null
  document_count: number
  email_verified_at: string | null
  address?: UserRegistrationAddress | null
  documents?: UserRegistrationDocument[]
}

type Paginated<T> = {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export function fetchUserRegistrations(params: {
  status?: UserRegistrationStatus
  search?: string
  per_page?: number
} = {}) {
  const query = new URLSearchParams()
  if (params.status) query.set("status", params.status)
  if (params.search) query.set("search", params.search)
  if (params.per_page) query.set("per_page", String(params.per_page))

  const suffix = query.toString() ? `?${query.toString()}` : ""

  return apiFetch<Paginated<UserRegistration>>(
    `/admin/user-registrations${suffix}`,
  )
}

export function fetchUserRegistration(userId: number) {
  return apiFetch<{ data: UserRegistration }>(
    `/admin/user-registrations/${userId}`,
  )
}

export function approveUserRegistration(userId: number) {
  return apiFetch<{ message: string; data: UserRegistration }>(
    `/admin/user-registrations/${userId}/approve`,
    { method: "POST" },
  )
}

export function rejectUserRegistration(userId: number, reason: string) {
  return apiFetch<{ message: string; data: UserRegistration }>(
    `/admin/user-registrations/${userId}/reject`,
    { method: "POST", body: JSON.stringify({ reason }) },
  )
}

/** Returns a short-lived signed URL. Admin only, never cached. */
export function viewUserDocument(documentId: number) {
  return apiFetch<{
    data: {
      id: number
      document_type: string
      original_filename: string
      mime_type: string
      file_size: number
      temporary_url: string
    }
  }>(`/admin/user-documents/${documentId}/view`)
}
