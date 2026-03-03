import { Response } from "express";
/**
 * Send a standardized 500 error response for database failures.
 * In production, hides the raw error message.
 */
export declare function dbError(res: Response, error: {
    message: string;
}): void;
