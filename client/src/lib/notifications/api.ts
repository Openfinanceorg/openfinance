import { apiFetch } from "$lib/api-client";
import type {
  GetNotificationsResponse,
  NotificationFilter,
} from "@openfinance/shared";

export function fetchNotifications(params?: NotificationFilter) {
  const searchParams = new URLSearchParams();
  if (params) {
    if (params.limit !== undefined)
      searchParams.set("limit", String(params.limit));
    if (params.cursor) searchParams.set("cursor", params.cursor);
  }
  const query = searchParams.toString();
  return apiFetch<GetNotificationsResponse>(
    `/api/notifications${query ? `?${query}` : ""}`,
  );
}

export function fetchUnreadCount() {
  return apiFetch<{ unreadCount: number }>("/api/notifications/unread-count");
}

export function markNotificationsRead() {
  return apiFetch<{ ok: boolean }>("/api/notifications/mark-read", {
    method: "POST",
  });
}
