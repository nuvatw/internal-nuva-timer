import { Request, Response, NextFunction } from "express";
/**
 * Validates that `req.params.id` is a valid UUID.
 */
export declare function validateIdParam(req: Request, res: Response, next: NextFunction): void;
/**
 * Validates that `start` and `end` query parameters (if present) are YYYY-MM-DD.
 */
export declare function validateDateParams(req: Request, res: Response, next: NextFunction): void;
/**
 * Wraps an async route handler so unhandled rejections are forwarded to
 * the global error handler instead of crashing the process.
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): (req: Request, res: Response, next: NextFunction) => void;
