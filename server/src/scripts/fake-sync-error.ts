#!/usr/bin/env tsx

import "../env.js";
import { Command } from "commander";
import * as readline from "readline";
import { db } from "../db";
import {
  user,
  financialAccounts,
  accountConnections,
  institutionRegistry,
  syncJobs,
} from "../schema";
import { eq, and } from "drizzle-orm";

const program = new Command();

program
  .name("fake-sync-error")
  .description("Set or clear fake sync errors on accounts for testing");

async function resolveUserId(userIdOrEmail: string): Promise<string> {
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
    return found.id;
  }
  return userIdOrEmail;
}

async function getUserAccounts(userId: string) {
  return db
    .select({
      id: financialAccounts.id,
      name: financialAccounts.name,
      type: financialAccounts.type,
      accountConnectionId: financialAccounts.accountConnectionId,
      provider: accountConnections.provider,
      institutionName: institutionRegistry.name,
    })
    .from(financialAccounts)
    .innerJoin(
      accountConnections,
      eq(financialAccounts.accountConnectionId, accountConnections.id),
    )
    .leftJoin(
      institutionRegistry,
      eq(accountConnections.institutionRegistryId, institutionRegistry.id),
    )
    .where(eq(financialAccounts.userId, userId));
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

program
  .command("set")
  .description("Set a fake ITEM_LOGIN_REQUIRED sync error on an account")
  .argument("<userIdOrEmail>", "User ID or email")
  .action(async (userIdOrEmail: string) => {
    try {
      const userId = await resolveUserId(userIdOrEmail);
      const accounts = await getUserAccounts(userId);

      if (accounts.length === 0) {
        console.log(`No accounts found for user: ${userId}`);
        process.exit(0);
      }

      console.log(`\nAccounts for user ${userId}:\n`);
      for (let i = 0; i < accounts.length; i++) {
        const a = accounts[i];
        console.log(
          `  [${i + 1}] ${a.name} (${a.type}) — ${a.institutionName ?? "Unknown"}`,
        );
      }

      const answer = await prompt(`\nPick an account [1-${accounts.length}]: `);
      const idx = parseInt(answer, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= accounts.length) {
        console.error("Invalid selection.");
        process.exit(1);
      }

      const selected = accounts[idx];
      const now = new Date();
      await db.insert(syncJobs).values({
        userId,
        accountConnectionId: selected.accountConnectionId,
        provider: selected.provider,
        jobType: "transactions",
        status: "error",
        errorMessage: "ITEM_LOGIN_REQUIRED",
        startedAt: now,
        completedAt: now,
      });

      console.log(
        `\nInserted sync error for "${selected.name}" (connection ${selected.accountConnectionId}).`,
      );
      process.exit(0);
    } catch (error) {
      console.error("Failed:", error);
      process.exit(1);
    }
  });

program
  .command("clear")
  .description("Clear a sync error by inserting a successful sync job")
  .argument("<userIdOrEmail>", "User ID or email")
  .action(async (userIdOrEmail: string) => {
    try {
      const userId = await resolveUserId(userIdOrEmail);
      const accounts = await getUserAccounts(userId);

      if (accounts.length === 0) {
        console.log(`No accounts found for user: ${userId}`);
        process.exit(0);
      }

      console.log(`\nAccounts for user ${userId}:\n`);
      for (let i = 0; i < accounts.length; i++) {
        const a = accounts[i];
        console.log(
          `  [${i + 1}] ${a.name} (${a.type}) — ${a.institutionName ?? "Unknown"}`,
        );
      }

      const answer = await prompt(`\nPick an account [1-${accounts.length}]: `);
      const idx = parseInt(answer, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= accounts.length) {
        console.error("Invalid selection.");
        process.exit(1);
      }

      const selected = accounts[idx];
      const now = new Date();
      await db.insert(syncJobs).values({
        userId,
        accountConnectionId: selected.accountConnectionId,
        provider: selected.provider,
        jobType: "transactions",
        status: "success",
        startedAt: now,
        completedAt: now,
      });

      console.log(
        `\nInserted success sync job for "${selected.name}" (connection ${selected.accountConnectionId}).`,
      );
      process.exit(0);
    } catch (error) {
      console.error("Failed:", error);
      process.exit(1);
    }
  });

program.parse();
