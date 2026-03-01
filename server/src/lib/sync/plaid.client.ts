import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  CountryCode,
  type Institution as PlaidInstitution,
} from "plaid";

function getPlaidEnv(): string {
  const appEnv = process.env.APP_ENV || "dev";
  return appEnv === "prod" ? "production" : "sandbox";
}

function getPlaidSecret(): string | undefined {
  const appEnv = process.env.APP_ENV || "dev";
  return appEnv === "prod"
    ? process.env.PLAID_PROD_SECRET
    : process.env.PLAID_SANDBOX_SECRET;
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[getPlaidEnv()],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": getPlaidSecret(),
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export const PLAID_COUNTRY_CODES = [
  CountryCode.Us,
  CountryCode.Ca,
  CountryCode.Gb,
  CountryCode.De,
  CountryCode.Fr,
  CountryCode.Ie,
  CountryCode.Nl,
  CountryCode.Es,
  CountryCode.It,
];

/**
 * Stream all institutions from Plaid API in batches for memory-efficient processing
 * Yields each batch as it's fetched from the API
 */
export async function* streamAllPlaidInstitutions(options?: {
  batchSize?: number;
  limit?: number;
  onProgress?: (current: number, total: number, institutions: number) => void;
}): AsyncGenerator<PlaidInstitution[], void, unknown> {
  const { batchSize = 500, limit, onProgress } = options || {};
  let offset = 0;
  let totalInstitutions = 0;
  let hasMore = true;
  let totalPages: number | undefined;

  const perPage = Math.min(batchSize, 500); // Plaid's max is 500

  while (hasMore && (!limit || totalInstitutions < limit)) {
    const response = await plaidClient.institutionsGet({
      count: perPage,
      offset,
      country_codes: PLAID_COUNTRY_CODES,
      options: {
        include_optional_metadata: true,
      },
    });

    let institutions = response.data.institutions;

    // If we have a limit and adding this batch would exceed it, trim the batch
    if (limit && totalInstitutions + institutions.length > limit) {
      const remaining = limit - totalInstitutions;
      institutions = institutions.slice(0, remaining);
    }

    totalInstitutions += institutions.length;

    // Estimate total pages if not known
    if (!totalPages && institutions.length === perPage) {
      totalPages = Math.ceil((offset + institutions.length * 2) / perPage);
    }

    if (onProgress) {
      const currentPage = Math.floor(offset / perPage) + 1;
      onProgress(currentPage, totalPages || currentPage, totalInstitutions);
    }

    yield institutions;

    if (limit && totalInstitutions >= limit) {
      break;
    }

    if (institutions.length < perPage) {
      hasMore = false;
    } else {
      offset += perPage;
    }
  }
}

export type { PlaidInstitution };
