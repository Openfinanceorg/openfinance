import { describe, it, expect } from "vitest";
import { mapQuilttTypeToAccountType } from "./quiltt.service.js";

describe("mapQuilttTypeToAccountType", () => {
  it("should map depository account types correctly", () => {
    expect(mapQuilttTypeToAccountType("CHECKING")).toBe("depository");
    expect(mapQuilttTypeToAccountType("SAVINGS")).toBe("depository");
    expect(mapQuilttTypeToAccountType("MONEY_MARKET")).toBe("depository");
    expect(mapQuilttTypeToAccountType("CD")).toBe("depository");
  });

  it("should map credit account types correctly", () => {
    expect(mapQuilttTypeToAccountType("CREDIT_CARD")).toBe("credit");
    expect(mapQuilttTypeToAccountType("LINE_OF_CREDIT")).toBe("credit");
  });

  it("should map loan account types correctly", () => {
    expect(mapQuilttTypeToAccountType("LOAN")).toBe("loan");
    expect(mapQuilttTypeToAccountType("MORTGAGE")).toBe("loan");
    expect(mapQuilttTypeToAccountType("STUDENT")).toBe("loan");
    expect(mapQuilttTypeToAccountType("AUTO")).toBe("loan");
  });

  it("should map investment account types correctly", () => {
    expect(mapQuilttTypeToAccountType("INVESTMENT")).toBe("investment");
    expect(mapQuilttTypeToAccountType("BROKERAGE")).toBe("investment");
    expect(mapQuilttTypeToAccountType("RETIREMENT")).toBe("investment");
    expect(mapQuilttTypeToAccountType("401K")).toBe("investment");
    expect(mapQuilttTypeToAccountType("IRA")).toBe("investment");
  });

  it("should be case-insensitive", () => {
    expect(mapQuilttTypeToAccountType("checking")).toBe("depository");
    expect(mapQuilttTypeToAccountType("Savings")).toBe("depository");
    expect(mapQuilttTypeToAccountType("credit_card")).toBe("credit");
  });

  it("should default unknown types to depository", () => {
    expect(mapQuilttTypeToAccountType("UNKNOWN_TYPE")).toBe("depository");
    expect(mapQuilttTypeToAccountType("")).toBe("depository");
    expect(mapQuilttTypeToAccountType("RANDOM")).toBe("depository");
  });

  describe("Name-based detection for OTHER type", () => {
    it("should detect investment accounts by name when type is OTHER", () => {
      expect(mapQuilttTypeToAccountType("OTHER", "401K")).toBe("investment");
      expect(mapQuilttTypeToAccountType("OTHER", "My 401k Account")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Roth IRA")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Traditional IRA")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "403B")).toBe("investment");
      expect(mapQuilttTypeToAccountType("OTHER", "529 College Savings")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "ROLLOVER")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Retirement Account")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Brokerage Account")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Investment Portfolio")).toBe(
        "investment",
      );
    });

    it("should detect credit accounts by name when type is OTHER", () => {
      expect(mapQuilttTypeToAccountType("OTHER", "Credit Card")).toBe("credit");
      expect(mapQuilttTypeToAccountType("OTHER", "Visa CreditCard")).toBe(
        "credit",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Line of Credit")).toBe(
        "credit",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "HELOC")).toBe("credit");
    });

    it("should detect loan accounts by name when type is OTHER", () => {
      expect(mapQuilttTypeToAccountType("OTHER", "Home Mortgage")).toBe("loan");
      expect(mapQuilttTypeToAccountType("OTHER", "Auto Loan")).toBe("loan");
      expect(mapQuilttTypeToAccountType("OTHER", "Autoloan")).toBe("loan");
      expect(mapQuilttTypeToAccountType("OTHER", "Student Loan")).toBe("loan");
      expect(mapQuilttTypeToAccountType("OTHER", "Personal Loan")).toBe("loan");
    });

    it("should detect depository accounts by name when type is OTHER", () => {
      expect(mapQuilttTypeToAccountType("OTHER", "Checking Account")).toBe(
        "depository",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Savings Account")).toBe(
        "depository",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Money Market")).toBe(
        "depository",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "CD 12 Month")).toBe(
        "depository",
      );
    });

    it("should default to depository when name doesn't match any pattern", () => {
      expect(mapQuilttTypeToAccountType("OTHER", "Unknown Account")).toBe(
        "depository",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "My Account")).toBe(
        "depository",
      );
      expect(mapQuilttTypeToAccountType("OTHER")).toBe("depository");
    });

    it("should not use name-based detection for non-OTHER types", () => {
      expect(
        mapQuilttTypeToAccountType("CHECKING", "Investment Account"),
      ).toBe("depository");
      expect(mapQuilttTypeToAccountType("SAVINGS", "401K")).toBe("depository");
    });
  });
});
