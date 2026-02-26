import { randomUUID } from "crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { user, apiKeys } from "../schema";
import { createApiKeyForUser } from "./api-key.service";

describe("createApiKeyForUser", () => {
  const testUserId = `test-user-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    await db.insert(user).values({
      id: testUserId,
      name: "Test User",
      email: `${testUserId}@test.com`,
      emailVerified: false,
    });
  });

  afterAll(async () => {
    await db.delete(apiKeys).where(eq(apiKeys.userId, testUserId));
    await db.delete(user).where(eq(user.id, testUserId));
  });

  it("creates a key for a new user", async () => {
    const { key, plaintext } = await createApiKeyForUser(testUserId);

    expect(plaintext).toMatch(/^sk-/);
    expect(key.userId).toBe(testUserId);
    expect(key.prefix).toBe(plaintext.slice(0, 8));

    const rows = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, testUserId));
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(key.id);
  });

  it("deletes old key when creating new one", async () => {
    const { key: first } = await createApiKeyForUser(testUserId);
    const { key: second } = await createApiKeyForUser(testUserId);

    expect(second.id).not.toBe(first.id);

    const rows = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, testUserId));
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(second.id);
  });
});
