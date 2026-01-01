/**
 * Structured Logging Module
 *
 * Provides consistent, structured logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Contextual data attachment
 * - Child loggers for scoped logging
 * - JSON output in production for log aggregation
 * - Pretty console output in development
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *
 *   // Basic logging
 *   logger.info("User signed in", { userId: "123" });
 *
 *   // Error logging with Error object
 *   logger.error("Failed to create post", error, { postId: "456" });
 *
 *   // Child logger with persistent context
 *   const log = logger.child({ route: "/api/posts", method: "POST" });
 *   log.info("Creating post");
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Determines the minimum log level based on environment
 */
function getMinLogLevel(): LogLevel {
  if (process.env.LOG_LEVEL) {
    const level = process.env.LOG_LEVEL.toLowerCase() as LogLevel;
    if (level in LOG_LEVELS) {
      return level;
    }
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/**
 * Serializes an Error object for logging
 */
function serializeError(error: Error): SerializedError {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

/**
 * Logger class providing structured logging capabilities
 */
class Logger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = {}) {
    this.context = context;
    this.minLevel = getMinLogLevel();
  }

  /**
   * Creates a child logger with additional context
   * @param context - Additional context to include in all logs
   * @returns New Logger instance with combined context
   */
  child(context: LogContext): Logger {
    const child = new Logger({ ...this.context, ...context });
    return child;
  }

  /**
   * Checks if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    };

    if (process.env.NODE_ENV === "production") {
      // JSON output for production log aggregation
      const consoleMethod = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
      consoleMethod(JSON.stringify(entry));
    } else {
      // Pretty output for development
      const color = this.getColor(level);
      const prefix = `[${entry.timestamp.split("T")[1].split(".")[0]}] ${level.toUpperCase().padEnd(5)}`;
      const contextStr = Object.keys(this.context).length > 0
        ? ` ${JSON.stringify(this.context)}`
        : "";
      const dataStr = data && Object.keys(data).length > 0
        ? ` ${JSON.stringify(data)}`
        : "";

      if (level === "error") {
        console.error(`${color}${prefix}\x1b[0m ${message}${contextStr}${dataStr}`);
      } else if (level === "warn") {
        console.warn(`${color}${prefix}\x1b[0m ${message}${contextStr}${dataStr}`);
      } else {
        console.log(`${color}${prefix}\x1b[0m ${message}${contextStr}${dataStr}`);
      }
    }
  }

  /**
   * Gets ANSI color code for log level
   */
  private getColor(level: LogLevel): string {
    switch (level) {
      case "debug":
        return "\x1b[90m"; // Gray
      case "info":
        return "\x1b[36m"; // Cyan
      case "warn":
        return "\x1b[33m"; // Yellow
      case "error":
        return "\x1b[31m"; // Red
      default:
        return "\x1b[0m"; // Reset
    }
  }

  /**
   * Log a debug message
   * @param message - Log message
   * @param data - Optional contextual data
   */
  debug(message: string, data?: LogContext): void {
    this.log("debug", message, data);
  }

  /**
   * Log an info message
   * @param message - Log message
   * @param data - Optional contextual data
   */
  info(message: string, data?: LogContext): void {
    this.log("info", message, data);
  }

  /**
   * Log a warning message
   * @param message - Log message
   * @param data - Optional contextual data
   */
  warn(message: string, data?: LogContext): void {
    this.log("warn", message, data);
  }

  /**
   * Log an error message
   * @param message - Log message
   * @param error - Optional Error object to include
   * @param data - Optional contextual data
   */
  error(message: string, error?: Error | null, data?: LogContext): void {
    const errorData: LogContext = { ...data };
    if (error) {
      errorData.error = serializeError(error);
    }
    this.log("error", message, errorData);
  }

  /**
   * Create a timer for performance logging
   * @param label - Timer label
   * @returns Object with end() method to log duration
   */
  time(label: string): { end: (data?: LogContext) => void } {
    const start = performance.now();
    return {
      end: (data?: LogContext) => {
        const duration = performance.now() - start;
        this.debug(`${label} completed`, {
          ...data,
          durationMs: Math.round(duration * 100) / 100,
        });
      },
    };
  }
}

/**
 * Default logger instance
 * Can be used directly or extended with child() for scoped logging
 */
export const logger = new Logger();

/**
 * Create a request-scoped logger for API routes
 * @param request - Incoming request
 * @returns Logger with request context
 */
export function createRequestLogger(request: Request): Logger {
  const url = new URL(request.url);
  return logger.child({
    method: request.method,
    path: url.pathname,
    requestId: crypto.randomUUID().slice(0, 8),
  });
}

/**
 * Export Logger class for custom instances
 */
export { Logger };
export type { LogLevel, LogContext };
