import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../lib/middleware";
import { transactionService } from "../lib/transaction.service";
import type {
  AmountFilter,
  GetTransactionsResponse,
  SortOption,
  TransactionFilter,
  TransactionStatus,
} from "@shared/types/transaction";

const transactionRoutes = new Hono<AuthEnv>();

transactionRoutes.use("*", requireAuth);

function parseNumber(value?: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseBoolean(value?: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseCsv(value?: string): string[] | undefined {
  if (!value) return undefined;
  const parsed = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
}

function parseJson<T>(value?: string): T | undefined {
  if (!value) return undefined;
  return JSON.parse(value) as T;
}

function parseStatus(value?: string): TransactionStatus[] | undefined {
  const statuses = parseCsv(value);
  if (!statuses) return undefined;

  const allowed = new Set<TransactionStatus>(["active", "hidden", "deleted"]);
  const valid = statuses.filter((status): status is TransactionStatus =>
    allowed.has(status as TransactionStatus),
  );

  return valid.length > 0 ? valid : undefined;
}

// GET /api/transactions
transactionRoutes.get("/", async (c) => {
  const user = c.get("user");

  try {
    const filter: TransactionFilter = {
      startDate: c.req.query("startDate"),
      endDate: c.req.query("endDate"),
      searchText: c.req.query("search"),
      searchPatterns: parseCsv(c.req.query("searchPatterns")),
      merchants: parseCsv(c.req.query("merchants")),
      amountFilters: parseJson<AmountFilter[]>(c.req.query("amountFilters")),
      sort: parseJson<SortOption>(c.req.query("sort")),
      accountId: parseNumber(c.req.query("accountId")),
      limit: parseNumber(c.req.query("limit")),
      cursor: c.req.query("cursor"),
      pending: parseBoolean(c.req.query("pending")),
      status: parseStatus(c.req.query("status")),
    };

    const transactions = await transactionService.getTransactionsByUserId(
      user.id,
      filter,
    );

    const response: GetTransactionsResponse = { transactions };
    return c.json(response);
  } catch (error) {
    console.error("Error fetching transactions", error);
    return c.json({ error: "Failed to fetch transactions" }, 500);
  }
});

export default transactionRoutes;
