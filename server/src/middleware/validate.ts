import { Request, Response, NextFunction } from "express";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates that `req.params.id` is a valid UUID.
 */
export function validateIdParam(req: Request, res: Response, next: NextFunction): void {
  const id = req.params.id as string | undefined;
  if (!id || !UUID_RE.test(id)) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Invalid ID format" },
    });
    return;
  }
  next();
}

/**
 * Validates that `start` and `end` query parameters (if present) are YYYY-MM-DD.
 */
export function validateDateParams(req: Request, res: Response, next: NextFunction): void {
  const { start, end } = req.query;
  if (start && !DATE_RE.test(start as string)) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Invalid start date format, expected YYYY-MM-DD" },
    });
    return;
  }
  if (end && !DATE_RE.test(end as string)) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Invalid end date format, expected YYYY-MM-DD" },
    });
    return;
  }
  next();
}

/**
 * Wraps an async route handler so unhandled rejections are forwarded to
 * the global error handler instead of crashing the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
