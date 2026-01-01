import { describe, expect, test } from "bun:test";
import { cn, formatBytes, formatDuration } from "@/lib/utils";

describe("cn (className merge)", () => {
  test("merges class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  test("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toContain("active");
  });

  test("handles false conditions", () => {
    const isActive = false;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base");
  });

  test("merges Tailwind classes correctly", () => {
    const result = cn("px-4", "px-6");
    expect(result).toBe("px-6");
  });

  test("handles array of classes", () => {
    const result = cn(["foo", "bar"]);
    expect(result).toBe("foo bar");
  });
});

describe("formatDuration", () => {
  test("formats seconds only", () => {
    expect(formatDuration(45)).toBe("0:45");
  });

  test("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("2:05");
  });

  test("formats hours, minutes, and seconds", () => {
    expect(formatDuration(3725)).toBe("1:02:05");
  });

  test("handles zero", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  test("pads seconds correctly", () => {
    expect(formatDuration(61)).toBe("1:01");
  });

  test("pads minutes correctly for hours format", () => {
    expect(formatDuration(3605)).toBe("1:00:05");
  });
});

describe("formatBytes", () => {
  test("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 Bytes");
  });

  test("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 Bytes");
  });

  test("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
  });

  test("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1 MB");
  });

  test("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1 GB");
  });

  test("formats with custom decimals", () => {
    expect(formatBytes(1536, 0)).toBe("2 KB");
    expect(formatBytes(1536, 1)).toBe("1.5 KB");
  });

  test("handles large numbers", () => {
    expect(formatBytes(5368709120)).toBe("5 GB");
  });
});
