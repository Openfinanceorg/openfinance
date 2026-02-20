import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenFinanceClient } from "../client.js";

export function registerTransactionTools(
  server: McpServer,
  client: OpenFinanceClient,
) {
  server.tool(
    "get_transactions",
    "Search and filter financial transactions. Returns transactions sorted by date (newest first) by default. For spending analysis, category breakdowns, or questions like 'how much do I spend on X', fetch all transactions (high limit, no search filter) and categorize them client-side by analyzing merchant/transaction names, since transactions do not have category labels.",
    {
      startDate: z
        .string()
        .describe("Start date filter (YYYY-MM-DD)")
        .optional(),
      endDate: z.string().describe("End date filter (YYYY-MM-DD)").optional(),
      search: z
        .string()
        .describe("Search by transaction name or merchant")
        .optional(),
      merchants: z
        .array(z.string())
        .describe("Filter by exact merchant names")
        .optional(),
      accountId: z.number().int().describe("Filter by account ID").optional(),
      limit: z
        .number()
        .int()
        .positive()
        .max(500)
        .describe("Max results (default 100, max 500)")
        .optional(),
      cursor: z.string().describe("Cursor for pagination").optional(),
      pending: z.boolean().describe("Filter pending transactions").optional(),
      status: z
        .array(z.enum(["active", "hidden", "deleted"]))
        .describe("Filter by status")
        .optional(),
    },
    async (params) => {
      const result = await client.getTransactions({
        startDate: params.startDate,
        endDate: params.endDate,
        searchText: params.search,
        merchants: params.merchants,
        accountId: params.accountId,
        limit: params.limit,
        cursor: params.cursor,
        pending: params.pending,
        status: params.status,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result.transactions, null, 2),
          },
        ],
      };
    },
  );
}
