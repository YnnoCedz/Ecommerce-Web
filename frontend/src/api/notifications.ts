import { apiFetch } from "./client"
import { singleFlight } from "./requestCache"

export type NotificationRecord = {
  id: number
  category: string
  title: string
  body: string
  action_type: string | null
  action_label: string | null
  order_id: number | null
  order_number: string | null
  seller_order_id: number | null
  product_id: number | null
  conversation_id: number | null
  read_at: string | null
  dismissed_at: string | null
  created_at: string | null
}

export type NotificationCategorySummary = {
  category: string
  label: string
  count: number
  unread_count: number
}

export type NotificationFeedMeta = {
  total_count: number
  unread_count: number
  limit: number
  categories: NotificationCategorySummary[]
}

export type NotificationFeedResponse = {
  data: NotificationRecord[]
  meta: NotificationFeedMeta
}

export async function fetchNotifications(params?: {
  limit?: number
  category?: string
  include_dismissed?: boolean
}) {
  const searchParams = new URLSearchParams()
  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit))
  }
  if (params?.category) {
    searchParams.set("category", params.category)
  }
  if (params?.include_dismissed) {
    searchParams.set("include_dismissed", "1")
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : ""
  return singleFlight(`notifications:${suffix}`, () =>
    apiFetch<NotificationFeedResponse>(`/notifications${suffix}`),
  )
}

export async function markNotificationRead(notificationId: number) {
  return apiFetch<{ message: string; data: NotificationRecord }>(
    `/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    },
  )
}

export async function dismissNotification(notificationId: number) {
  return apiFetch<{ message: string; data: NotificationRecord }>(
    `/notifications/${notificationId}/dismiss`,
    {
      method: "PATCH",
    },
  )
}

export async function markAllNotificationsRead() {
  return apiFetch<{ message: string; data: { updated: number } }>(
    "/notifications/mark-all-read",
    {
      method: "POST",
    },
  )
}
