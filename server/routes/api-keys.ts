import { Router } from "express";
import crypto from "crypto";
import { db } from "../db/connection.js";
import { apiKeys } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { adminAuth, AdminRequest } from "../middleware/admin-auth.js";

const router = Router();

// All routes require admin auth
router.use(adminAuth as any);

// GET /api/admin/api-keys
router.get("/", async (req, res) => {
  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      key: apiKeys.key,
      isActive: apiKeys.isActive,
      requestCount: apiKeys.requestCount,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .orderBy(apiKeys.createdAt);

  res.json(keys);
});

// POST /api/admin/api-keys
router.post("/", async (req: AdminRequest, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: "Ime API ključa je obavezno" });
    return;
  }

  const key = "sk_" + crypto.randomBytes(32).toString("hex");
  const [created] = await db
    .insert(apiKeys)
    .values({ key, name, userId: req.adminId! })
    .returning();

  res.json(created);
});

// DELETE /api/admin/api-keys/:id
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
  res.json({ ok: true });
});

// PATCH /api/admin/api-keys/:id/revoke
router.patch("/:id/revoke", async (req, res) => {
  const id = parseInt(req.params.id);
  await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(eq(apiKeys.id, id));
  res.json({ ok: true });
});

// PATCH /api/admin/api-keys/:id/activate
router.patch("/:id/activate", async (req, res) => {
  const id = parseInt(req.params.id);
  await db
    .update(apiKeys)
    .set({ isActive: true })
    .where(eq(apiKeys.id, id));
  res.json({ ok: true });
});

export default router;
