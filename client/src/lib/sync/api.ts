const API_BASE = import.meta.env.VITE_API_URL || "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export function fetchAccounts() {
  return apiFetch<{ accounts: import("@shared/types").ConnectedAccount[] }>(
    "/api/accounts",
  );
}

export function createPlaidLinkToken() {
  return apiFetch<{ link_token: string }>("/api/plaid/create_link_token", {
    method: "POST",
  });
}

export function exchangePlaidPublicToken(
  publicToken: string,
  institutionId?: string,
) {
  return apiFetch<{ message: string }>("/api/plaid/exchange_public_token", {
    method: "POST",
    body: JSON.stringify({
      public_token: publicToken,
      institution_id: institutionId,
    }),
  });
}
