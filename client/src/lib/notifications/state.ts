import { writable } from "svelte/store";
import { fetchUnreadCount, markNotificationsRead } from "./api";

export const unreadCount = writable<number>(0);

export async function loadUnreadCount() {
  try {
    const result = await fetchUnreadCount();
    unreadCount.set(result.unreadCount);
  } catch {
    // ignore
  }
}

export async function markAllRead() {
  try {
    await markNotificationsRead();
    unreadCount.set(0);
  } catch {
    // ignore
  }
}
