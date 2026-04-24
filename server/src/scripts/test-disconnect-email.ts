#!/usr/bin/env tsx

import "../env.js";
import { Command } from "commander";
import * as readline from "readline";
import { db } from "../db";
import { user, accountConnections, institutionRegistry } from "../schema";
import { eq } from "drizzle-orm";
import { notificationService } from "../lib/notification.service";

const program = new Command();

program
  .name("test-disconnect-email")
  .description("Test sending the account disconnect notification email");

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
  .argument("<userIdOrEmail>", "User ID or email")
  .action(async (userIdOrEmail: string) => {
    try {
      const userId = await resolveUserId(userIdOrEmail);

      const connections = await db
        .select({
          id: accountConnections.id,
          provider: accountConnections.provider,
          institutionName: institutionRegistry.name,
        })
        .from(accountConnections)
        .leftJoin(
          institutionRegistry,
          eq(accountConnections.institutionRegistryId, institutionRegistry.id),
        )
        .where(eq(accountConnections.userId, userId));

      if (connections.length === 0) {
        console.log(`No connections found for user: ${userId}`);
        process.exit(0);
      }

      console.log(`\nConnections for user ${userId}:\n`);
      for (let i = 0; i < connections.length; i++) {
        const c = connections[i];
        console.log(
          `  [${i + 1}] ${c.institutionName ?? "Unknown"} (${c.provider}, id=${c.id})`,
        );
      }

      const answer = await prompt(
        `\nPick a connection [1-${connections.length}]: `,
      );
      const idx = parseInt(answer, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= connections.length) {
        console.error("Invalid selection.");
        process.exit(1);
      }

      const selected = connections[idx];
      const institutionName = selected.institutionName ?? "Unknown Institution";

      console.log(
        `\nSending disconnect email for "${institutionName}" (connection ${selected.id})...`,
      );

      const result = await notificationService.sendAccountDisconnectEmail({
        userId,
        connectionId: selected.id,
      });

      if (result) {
        console.log(`Sent! Notification logged with id=${result.id}`);
      } else {
        console.log(
          "Deduped — a disconnect email was already sent in the last 24h.",
        );
      }

      process.exit(0);
    } catch (error) {
      console.error("Failed:", error);
      process.exit(1);
    }
  });

program.parse();
