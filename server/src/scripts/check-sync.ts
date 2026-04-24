#!/usr/bin/env tsx
import "../env.js";
import { db } from "../db";
import { user, accountConnections } from "../schema";
import { eq, and } from "drizzle-orm";
import { mxService } from "../lib/sync/mx.service";

async function main() {
  const [u] = await db
    .select({ id: user.id, mxUserGuid: user.mxUserGuid })
    .from(user)
    .where(eq(user.email, "winxton@gmail.com"))
    .limit(1);
  console.log("User:", u.id, "MX GUID:", u.mxUserGuid);

  const [conn] = await db
    .select()
    .from(accountConnections)
    .where(
      and(eq(accountConnections.userId, u.id), eq(accountConnections.id, 9)),
    )
    .limit(1);

  console.log("Connection 9 memberGuid:", conn.mxMemberGuid);
  console.log("lastSyncedAt:", conn.lastSyncedAt);

  if (u.mxUserGuid && conn.mxMemberGuid) {
    console.log("\n=== MX MEMBER STATUS ===");
    const status = await mxService.getMemberStatus(
      u.mxUserGuid,
      conn.mxMemberGuid,
    );
    console.log(JSON.stringify(status, null, 2));
  }
}

main().then(() => process.exit(0));
