import { Request, Response, NextFunction } from "express";
import { supabase } from "../supabase.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      requestId?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header" } });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
      return;
    }

    req.userId = data.user.id;
    next();
  } catch {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication failed" } });
  }
}
