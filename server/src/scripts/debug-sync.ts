#!/usr/bin/env tsx
import "../env.js";
import { db } from "../db";
import {
  accountConnections,
  institutionRegistry,
  user,
  syncJobs,
} from "../schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const email = process.argv[2] || "winxton@gmail.com";

  const [u] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!u) {
    console.log("User not found:", email);
    return;
  }
  console.log("User ID:", u.id);

  const conns = await db
    .select({
      id: accountConnections.id,
      provider: accountConnections.provider,
      status: accountConnections.status,
      lastSyncedAt: accountConnections.lastSyncedAt,
      hasCursor: accountConnections.transactionCursor,
      institutionName: institutionRegistry.name,
    })
    .from(accountConnections)
    .leftJoin(
      institutionRegistry,
      eq(accountConnections.institutionRegistryId, institutionRegistry.id),
    )
    .where(eq(accountConnections.userId, u.id));

  console.log("\n=== CONNECTIONS ===");
  for (const conn of conns) {
    console.log(`  ID: ${conn.id}`);
    console.log(`  Institution: ${conn.institutionName ?? "Unknown"}`);
    console.log(`  Provider: ${conn.provider}`);
    console.log(`  Status: ${conn.status}`);
    console.log(
      `  Last Synced: ${conn.lastSyncedAt?.toISOString() ?? "Never"}`,
    );
    console.log(`  Has Cursor: ${conn.hasCursor ? "Yes" : "No"}`);
    console.log();
  }

  for (const conn of conns) {
    const jobs = await db
      .select({
        id: syncJobs.id,
        status: syncJobs.status,
        errorMessage: syncJobs.errorMessage,
        errorCode: syncJobs.errorCode,
        recordsProcessed: syncJobs.recordsProcessed,
        startedAt: syncJobs.startedAt,
        completedAt: syncJobs.completedAt,
        createdAt: syncJobs.createdAt,
      })
      .from(syncJobs)
      .where(eq(syncJobs.accountConnectionId, conn.id))
      .orderBy(desc(syncJobs.createdAt))
      .limit(5);

    console.log(
      `=== SYNC JOBS for connection ${conn.id} (${conn.institutionName ?? "unknown"}) ===`,
    );
    for (const job of jobs) {
      console.log(`  Job ${job.id}: ${job.status}`);
      console.log(`    Created:   ${job.createdAt?.toISOString()}`);
      console.log(`    Started:   ${job.startedAt?.toISOString() ?? "-"}`);
      console.log(`    Completed: ${job.completedAt?.toISOString() ?? "-"}`);
      console.log(`    Records:   ${job.recordsProcessed ?? 0}`);
      if (job.errorMessage) console.log(`    Error:     ${job.errorMessage}`);
      if (job.errorCode) console.log(`    Code:      ${job.errorCode}`);
      console.log();
    }
  }
}

main().then(() => process.exit(0));
