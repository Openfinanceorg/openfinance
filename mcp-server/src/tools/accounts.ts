import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenFinanceClient } from "../client.js";

export function registerAccountTools(
  server: McpServer,
  client: OpenFinanceClient,
) {
  server.tool(
    "get_accounts",
    "Get all connected financial accounts with balances and institution info",
    {},
    async () => {
      const { accounts } = await client.getAccounts();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(accounts, null, 2),
          },
        ],
      };
    },
  );
}
