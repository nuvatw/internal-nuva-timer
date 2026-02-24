import { Response } from "express";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Send a standardized 500 error response for database failures.
 * In production, hides the raw error message.
 */
export function dbError(res: Response, error: { message: string }): void {
  const message = isProduction ? "Database operation failed" : error.message;
  res.status(500).json({ error: { code: "SERVER_ERROR", message } });
}
