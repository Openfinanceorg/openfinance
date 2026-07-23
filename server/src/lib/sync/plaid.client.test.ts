/**
 * Tests for extractPlaidError.
 *
 * The Plaid SDK is axios-based, so a rejected request surfaces as an
 * AxiosError whose `message` is only ever "Request failed with status code
 * 400" — the actual Plaid error_code lives in the response body. Reading only
 * the message meant every disconnected item was recorded as an anonymous 400,
 * so it was never parked and never notified, and the poller retried it every
 * 30 minutes indefinitely.
 */
import { describe, it, expect } from "vitest";
import { extractPlaidError } from "./plaid.client";

/** Shaped like a real AxiosError from a failed Plaid call. */
function axiosError(status: number, data: unknown) {
  const err = new Error(`Request failed with status code ${status}`);
  return Object.assign(err, { isAxiosError: true, response: { status, data } });
}

describe("extractPlaidError", () => {
  it("reads error_code out of the response body, not the axios message", () => {
    const result = extractPlaidError(
      axiosError(400, {
        error_code: "ITEM_LOGIN_REQUIRED",
        error_type: "ITEM_ERROR",
        error_message: "the login details of this item have changed",
      }),
    );

    expect(result.errorCode).toBe("ITEM_LOGIN_REQUIRED");
    expect(result.errorType).toBe("ITEM_ERROR");
    expect(result.message).toBe(
      "the login details of this item have changed",
    );
    expect(result.message).not.toContain("status code 400");
  });

  it("falls back to display_message when error_message is absent", () => {
    const result = extractPlaidError(
      axiosError(400, {
        error_code: "INSTITUTION_DOWN",
        display_message: "This bank is temporarily unavailable.",
      }),
    );

    expect(result.errorCode).toBe("INSTITUTION_DOWN");
    expect(result.message).toBe("This bank is temporarily unavailable.");
  });

  it("falls back to the axios message when the body carries no error_code", () => {
    const result = extractPlaidError(axiosError(503, { something: "else" }));

    expect(result.errorCode).toBeUndefined();
    expect(result.message).toBe("Request failed with status code 503");
  });

  it("handles a plain Error with no response at all", () => {
    const result = extractPlaidError(new Error("socket hang up"));

    expect(result.errorCode).toBeUndefined();
    expect(result.message).toBe("socket hang up");
  });

  it("handles a non-Error throw", () => {
    const result = extractPlaidError("boom");

    expect(result.errorCode).toBeUndefined();
    expect(result.message).toBe("Unknown sync error");
  });
});
