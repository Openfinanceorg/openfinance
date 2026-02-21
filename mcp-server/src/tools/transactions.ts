import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenFinanceClient } from "../client.js";

export function registerTransactionTools(
  server: McpServer,
  client: OpenFinanceClient,
) {
  server.tool(
    "get_transactions",
    "Search and filter financial transactions. Returns transactions sorted by date (newest first) by default. Use the `fields` parameter to reduce payload size by requesting only the fields you need. For spending analysis, aggregations, or category breakdowns, use the `query_transactions` tool instead — it lets you write SQL for efficient server-side computation.",
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
      fields: z
        .array(z.string())
        .describe(
          "Return only these fields per transaction (e.g. ['name', 'amount', 'date', 'merchantName']). Omit to return all fields.",
        )
        .optional(),
      amountFilters: z
        .array(
          z.object({
            operator: z.enum([">", "<", ">=", "<=", "="]),
            amount: z.number(),
          }),
        )
        .describe(
          "Filter by amount using comparison operators (e.g. [{ operator: '>', amount: 100 }])",
        )
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
        fields: params.fields,
        amountFilters: params.amountFilters,
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

  server.tool(
    "query_transactions",
    `Run a SQL query against the user's transactions. Write a SELECT query referencing the \`txns\` CTE which has columns: id, name, amount (numeric), date, authorized_date, merchant_name, pending, iso_currency_code, account_id, status, created_at, updated_at. The query runs in a read-only transaction with a 5s timeout and 1000 row limit. Errors are returned so you can self-correct SQL syntax.

Example queries:
- SELECT SUM(amount), COUNT(*) FROM txns WHERE merchant_name ILIKE '%starbucks%'
- SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(amount), COUNT(*) FROM txns GROUP BY 1 ORDER BY 1
- SELECT COALESCE(merchant_name, name) as merchant, SUM(amount) as total FROM txns GROUP BY 1 ORDER BY total DESC LIMIT 10`,
    {
      sql: z
        .string()
        .describe(
          "SQL SELECT query referencing the `txns` CTE. Do not include CTE definition, LIMIT, or transaction control statements.",
        ),
    },
    async (params) => {
      const result = await client.queryTransactions(params.sql);

      if ("error" in result) {
        return {
          content: [
            {
              type: "text" as const,
              text: `SQL error: ${result.error}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { rows: result.rows, rowCount: result.rowCount },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
