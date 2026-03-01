// MX API Types
export interface MXInstitution {
  code: string;
  name: string;
  url?: string;
  small_logo_url?: string;
  medium_logo_url?: string;
  supports_account_identification?: boolean;
  supports_transaction_history?: boolean;
  supports_account_statement?: boolean;
  supports_account_verification?: boolean;
}

interface MXInstitutionsResponse {
  institutions: MXInstitution[];
  pagination: {
    current_page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export function isMxConfigured(): boolean {
  return !!(
    process.env.MX_CLIENT_ID &&
    process.env.MX_API_KEY &&
    process.env.MX_API_URL
  );
}

function getMxConfig() {
  const clientId = process.env.MX_CLIENT_ID;
  const apiKey = process.env.MX_API_KEY;
  const baseUrl = process.env.MX_API_URL;

  if (!clientId || !apiKey || !baseUrl) {
    throw new Error(
      "Missing required MX environment variables: MX_CLIENT_ID, MX_API_KEY, MX_API_URL",
    );
  }

  const basicAuthValue = Buffer.from(`${clientId}:${apiKey}`).toString(
    "base64",
  );

  return { baseUrl, basicAuthValue };
}

async function mxRequest<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> {
  const { baseUrl, basicAuthValue } = getMxConfig();

  const url = new URL(endpoint, baseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/vnd.mx.api.v1+json",
      Authorization: `Basic ${basicAuthValue}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `MX API error: ${response.status} ${response.statusText} - ${body}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Stream all institutions from MX API in batches for memory-efficient processing
 * Yields each batch as it's fetched from the API
 */
export async function* streamAllMxInstitutions(options?: {
  batchSize?: number;
  limit?: number;
  onProgress?: (current: number, total: number, institutions: number) => void;
}): AsyncGenerator<MXInstitution[], void, unknown> {
  const { batchSize = 100, limit, onProgress } = options || {};
  let currentPage = 1;
  let hasMore = true;
  let totalInstitutions = 0;
  let totalPages: number | undefined;

  const perPage = Math.min(batchSize, 100); // MX API max is 100

  while (hasMore && (!limit || totalInstitutions < limit)) {
    const response = await mxRequest<MXInstitutionsResponse>("/institutions", {
      page: currentPage.toString(),
      records_per_page: perPage.toString(),
    });

    let institutions = response.institutions;

    // If we have a limit and adding this batch would exceed it, trim the batch
    if (limit && totalInstitutions + institutions.length > limit) {
      const remaining = limit - totalInstitutions;
      institutions = institutions.slice(0, remaining);
    }

    totalInstitutions += institutions.length;

    if (!totalPages) {
      totalPages = response.pagination.total_pages;
    }

    if (onProgress) {
      onProgress(currentPage, totalPages, totalInstitutions);
    }

    yield institutions;

    if (limit && totalInstitutions >= limit) {
      break;
    }

    hasMore = currentPage < response.pagination.total_pages;
    currentPage++;
  }
}
