import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, type AuthEnv } from "../lib/middleware";
import { transactionService } from "../lib/transaction.service";
import type {
  GetTransactionsResponse,
  TransactionFilter,
} from "@shared/types/transaction";

const csv = z
  .string()
  .transform((s) =>
    s
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string()).min(1));

const transactionQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  searchPatterns: csv.optional(),
  merchants: csv.optional(),
  amountFilters: z
    .string()
    .transform((s) => JSON.parse(s))
    .pipe(
      z.array(
        z.object({
          operator: z.enum([">", "<", ">=", "<=", "="]),
          amount: z.number(),
        }),
      ),
    )
    .optional(),
  sort: z
    .string()
    .transform((s) => JSON.parse(s))
    .pipe(
      z.object({
        orderField: z.enum(["date", "amount", "createdAt"]),
        ordering: z.enum(["asc", "desc"]),
      }),
    )
    .optional(),
  accountId: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().positive().optional(),
  cursor: z.string().optional(),
  pending: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  status: csv
    .pipe(z.array(z.enum(["active", "hidden", "deleted"])).min(1))
    .optional(),
});

const transactionRoutes = new Hono<AuthEnv>();

transactionRoutes.use("*", requireAuth);

// GET /api/transactions
transactionRoutes.get(
  "/",
  zValidator("query", transactionQuerySchema),
  async (c) => {
    const user = c.get("user");
    const q = c.req.valid("query");

    try {
      const filter: TransactionFilter = {
        startDate: q.startDate,
        endDate: q.endDate,
        searchText: q.search,
        searchPatterns: q.searchPatterns,
        merchants: q.merchants,
        amountFilters: q.amountFilters,
        sort: q.sort,
        accountId: q.accountId,
        limit: q.limit,
        cursor: q.cursor,
        pending: q.pending,
        status: q.status,
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
  },
);

export default transactionRoutes;
