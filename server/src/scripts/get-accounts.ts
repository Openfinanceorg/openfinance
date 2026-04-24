#!/usr/bin/env tsx

import "../env.js";
import { Command } from "commander";
import { db } from "../db";
import {
  financialAccounts,
  accountConnections,
  institutionRegistry,
  user,
} from "../schema";
import { eq } from "drizzle-orm";

const program = new Command();

program
  .name("get-accounts")
  .description("List financial accounts for a user")
  .argument("<userIdOrEmail>", "User ID or email")
  .action(async (userIdOrEmail: string) => {
    try {
      let userId = userIdOrEmail;

      if (userIdOrEmail.includes("@")) {
        const [found] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, userIdOrEmail))
          .limit(1);

        if (!found) {
          console.error(`No user found with email: ${userIdOrEmail}`);
          process.exit(1);
        }
        userId = found.id;
      }

      const accounts = await db
        .select({
          name: financialAccounts.name,
          officialName: financialAccounts.officialName,
          type: financialAccounts.type,
          subtype: financialAccounts.subtype,
          mask: financialAccounts.mask,
          currentBalance: financialAccounts.currentBalance,
          provider: accountConnections.provider,
          institutionName: institutionRegistry.name,
        })
        .from(financialAccounts)
        .leftJoin(
          accountConnections,
          eq(financialAccounts.accountConnectionId, accountConnections.id),
        )
        .leftJoin(
          institutionRegistry,
          eq(accountConnections.institutionRegistryId, institutionRegistry.id),
        )
        .where(eq(financialAccounts.userId, userId));

      if (accounts.length === 0) {
        console.log(`No accounts found for user: ${userId}`);
        process.exit(0);
      }

      console.log(`Found ${accounts.length} account(s)\n`);
      console.table(
        accounts.map((a) => ({
          name: a.name,
          officialName: a.officialName ?? "",
          type: a.type,
          subtype: a.subtype ?? "",
          mask: a.mask ?? "",
          balance: a.currentBalance ?? "",
          provider: a.provider ?? "",
          institution: a.institutionName ?? "",
        })),
      );

      process.exit(0);
    } catch (error) {
      console.error("Failed to get accounts:", error);
      process.exit(1);
    }
  });

program.parse();
