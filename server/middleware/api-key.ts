import { Request, Response, NextFunction } from "express";
import { db } from "../db/connection.js";
import { apiKeys } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

export interface ApiKeyRequest extends Request {
  apiKeyId?: number;
  apiKeyName?: string;
}

export async function apiKeyAuth(req: ApiKeyRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer sk_")) {
    res.status(401).json({ error: "Potreban je API ključ (Authorization: Bearer sk_...)" });
    return;
  }

  const key = authHeader.slice(7);
  try {
    const [found] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key, key))
      .limit(1);

    if (!found || !found.isActive) {
      res.status(401).json({ error: "Nevažeći ili deaktiviran API ključ" });
      return;
    }

    // Track usage
    await db
      .update(apiKeys)
      .set({
        requestCount: sql`${apiKeys.requestCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(apiKeys.id, found.id));

    req.apiKeyId = found.id;
    req.apiKeyName = found.name;
    next();
  } catch (err) {
    console.error("API key validation error:", err);
    res.status(500).json({ error: "Greška pri validaciji API ključa" });
  }
}
