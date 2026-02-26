import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { apiKeys } from "../schema.js";

export async function createApiKeyForUser(userId: string) {
  // Delete all existing keys for the user
  await db.delete(apiKeys).where(eq(apiKeys.userId, userId));

  // Generate a new key
  const raw = crypto.randomBytes(32).toString("base64url");
  const plaintext = `sk-${raw}`;
  const prefix = plaintext.slice(0, 8);
  const keyHash = crypto.createHash("sha256").update(plaintext).digest("hex");

  const [key] = await db
    .insert(apiKeys)
    .values({
      userId,
      keyHash,
      prefix,
    })
    .returning();

  return { key, plaintext };
}
