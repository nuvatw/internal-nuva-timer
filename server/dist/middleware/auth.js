"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const supabase_js_1 = require("../supabase.js");
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header" } });
        return;
    }
    const token = authHeader.slice(7);
    try {
        const { data, error } = await supabase_js_1.supabase.auth.getUser(token);
        if (error || !data.user) {
            res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
            return;
        }
        req.userId = data.user.id;
        next();
    }
    catch {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication failed" } });
    }
}
