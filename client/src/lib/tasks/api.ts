import { apiFetch } from "$lib/api-client";

export interface Task {
  id: string;
  type: "account_disconnected";
  title: string;
  description: string;
  accountId: number;
  institutionName: string;
}

export function fetchTasks() {
  return apiFetch<{ tasks: Task[] }>("/api/tasks").then((r) => r.tasks);
}
