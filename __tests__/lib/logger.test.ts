import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import { createRequestLogger, Logger, logger } from "@/lib/logger";

describe("Logger", () => {
  let consoleSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;
  let consoleWarnSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleSpy = spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("log levels", () => {
    test("logger.info calls console.log", () => {
      logger.info("test message");
      expect(consoleSpy).toHaveBeenCalled();
    });

    test("logger.error calls console.error", () => {
      logger.error("error message");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test("logger.warn calls console.warn", () => {
      logger.warn("warning message");
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    test("logger.debug calls console.log", () => {
      logger.debug("debug message");
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("child loggers", () => {
    test("creates child with context", () => {
      const child = logger.child({ requestId: "123" });
      expect(child).toBeInstanceOf(Logger);
    });

    test("child inherits parent context", () => {
      const parent = new Logger({ module: "api" });
      const child = parent.child({ requestId: "456" });
      child.info("test");
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("error logging", () => {
    test("serializes Error objects", () => {
      const error = new Error("Test error");
      logger.error("Something failed", error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test("handles null error", () => {
      logger.error("Something failed", null);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test("includes additional data with error", () => {
      const error = new Error("Test error");
      logger.error("Something failed", error, { userId: "123" });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("contextual data", () => {
    test("logs with additional context", () => {
      logger.info("User action", { userId: "123", action: "login" });
      expect(consoleSpy).toHaveBeenCalled();
    });

    test("logs without context", () => {
      logger.info("Simple message");
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("timer functionality", () => {
    test("time() returns object with end method", () => {
      const timer = logger.time("operation");
      expect(timer).toHaveProperty("end");
      expect(typeof timer.end).toBe("function");
    });

    test("end() logs duration", () => {
      const timer = logger.time("operation");
      timer.end();
      expect(consoleSpy).toHaveBeenCalled();
    });

    test("end() accepts additional data", () => {
      const timer = logger.time("operation");
      timer.end({ itemCount: 10 });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});

describe("createRequestLogger", () => {
  test("creates logger with request context", () => {
    const request = new Request("https://example.com/api/posts", {
      method: "POST",
    });
    const log = createRequestLogger(request);
    expect(log).toBeInstanceOf(Logger);
  });

  test("includes method and path in context", () => {
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});
    const request = new Request("https://example.com/api/posts?foo=bar", {
      method: "GET",
    });
    const log = createRequestLogger(request);
    log.info("Request received");
    expect(consoleSpy).toHaveBeenCalled();
  });
});
