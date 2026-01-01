import { describe, expect, test } from "bun:test";
import {
  ensureUniqueSlug,
  generateMemberSlug,
  generateSlug,
  isValidSlug,
  memberProfileUrl,
} from "@/lib/slug-utils";

describe("generateSlug", () => {
  test("converts to lowercase", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  test("replaces spaces with hyphens", () => {
    expect(generateSlug("hello world")).toBe("hello-world");
  });

  test("removes special characters", () => {
    expect(generateSlug("Hello! World?")).toBe("hello-world");
  });

  test("removes multiple consecutive hyphens", () => {
    expect(generateSlug("hello   world")).toBe("hello-world");
  });

  test("removes leading and trailing hyphens", () => {
    expect(generateSlug(" hello world ")).toBe("hello-world");
  });

  test("handles empty string", () => {
    expect(generateSlug("")).toBe("");
  });

  test("truncates long slugs to 60 characters", () => {
    const longTitle =
      "this is a very long title that should be truncated to sixty characters maximum";
    const result = generateSlug(longTitle);
    expect(result.length).toBeLessThanOrEqual(60);
  });

  test("removes trailing hyphen after truncation", () => {
    const longTitle = "this is a very long title that ends at a bad spot-";
    const result = generateSlug(longTitle);
    expect(result.endsWith("-")).toBe(false);
  });

  test("handles underscores", () => {
    expect(generateSlug("hello_world")).toBe("hello-world");
  });

  test("handles numbers", () => {
    expect(generateSlug("hello world 123")).toBe("hello-world-123");
  });
});

describe("generateMemberSlug", () => {
  test("generates slug from full name", () => {
    expect(generateMemberSlug("John Doe")).toBe("john-doe");
  });

  test("handles multiple names", () => {
    expect(generateMemberSlug("John Michael Doe")).toBe("john-michael-doe");
  });
});

describe("ensureUniqueSlug", () => {
  test("returns base slug when no conflicts", () => {
    expect(ensureUniqueSlug("hello-world", [])).toBe("hello-world");
  });

  test("appends number when conflict exists", () => {
    expect(ensureUniqueSlug("hello-world", ["hello-world"])).toBe("hello-world-1");
  });

  test("increments number for multiple conflicts", () => {
    expect(ensureUniqueSlug("hello-world", ["hello-world", "hello-world-1", "hello-world-2"])).toBe(
      "hello-world-3",
    );
  });

  test("handles empty existing slugs array", () => {
    expect(ensureUniqueSlug("test", [])).toBe("test");
  });
});

describe("isValidSlug", () => {
  test("validates correct slug", () => {
    expect(isValidSlug("hello-world")).toBe(true);
  });

  test("validates slug with numbers", () => {
    expect(isValidSlug("hello-world-123")).toBe(true);
  });

  test("validates simple slug", () => {
    expect(isValidSlug("hello")).toBe(true);
  });

  test("rejects uppercase letters", () => {
    expect(isValidSlug("Hello-World")).toBe(false);
  });

  test("rejects special characters", () => {
    expect(isValidSlug("hello!world")).toBe(false);
  });

  test("rejects leading hyphen", () => {
    expect(isValidSlug("-hello")).toBe(false);
  });

  test("rejects trailing hyphen", () => {
    expect(isValidSlug("hello-")).toBe(false);
  });

  test("rejects consecutive hyphens", () => {
    expect(isValidSlug("hello--world")).toBe(false);
  });

  test("rejects empty string", () => {
    expect(isValidSlug("")).toBe(false);
  });

  test("rejects slug over 60 characters", () => {
    const longSlug = "a".repeat(61);
    expect(isValidSlug(longSlug)).toBe(false);
  });

  test("accepts slug at 60 characters", () => {
    const maxSlug = "a".repeat(60);
    expect(isValidSlug(maxSlug)).toBe(true);
  });
});

describe("memberProfileUrl", () => {
  test("generates correct profile URL", () => {
    const member = { slug: "john-doe", id: "123" };
    expect(memberProfileUrl(member)).toBe("/members/john-doe");
  });

  test("handles complex slug", () => {
    const member = { slug: "john-michael-doe-jr", id: "456" };
    expect(memberProfileUrl(member)).toBe("/members/john-michael-doe-jr");
  });
});
