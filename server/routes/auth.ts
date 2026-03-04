import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/connection.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signToken } from "../middleware/admin-auth.js";

const router = Router();

// POST /api/admin/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Potrebni su username i password" });
    return;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Pogrešni kredencijali" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Pogrešni kredencijali" });
    return;
  }

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, username: user.username } });
});

// POST /api/admin/setup — create initial admin (only if no users exist)
router.post("/setup", async (req, res) => {
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Admin nalog već postoji" });
    return;
  }

  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    res.status(400).json({ error: "Username i password (min 6 karaktera) su obavezni" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({ username, passwordHash })
    .returning();

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, username: user.username } });
});

// POST /api/admin/reset-password — reset admin password (only if one user exists)
router.post("/reset-password", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    res.status(400).json({ error: "Username i password (min 6 karaktera) su obavezni" });
    return;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Korisnik nije pronađen" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  res.json({ message: "Password uspešno promenjen" });
});

export default router;
