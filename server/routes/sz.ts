import { Router } from "express";
import { db } from "../db/connection.js";
import { stambeneZajednice } from "../db/schema.js";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import { apiKeyAuth, ApiKeyRequest } from "../middleware/api-key.js";
import { scrapeNbs } from "../services/nbs-scraper.js";
import { getAlternateScript } from "../utils/transliterate.js";

const router = Router();

router.use(apiKeyAuth as any);

// GET /api/v1/sz/by-mb?mb=
router.get("/by-mb", async (req: ApiKeyRequest, res) => {
  const mb = req.query.mb as string;
  if (!mb || !/^\d{8}$/.test(mb)) {
    res.status(400).json({ error: "Matični broj mora biti tačno 8 cifara" });
    return;
  }

  const [sz] = await db
    .select()
    .from(stambeneZajednice)
    .where(eq(stambeneZajednice.maticniBroj, mb))
    .limit(1);

  if (!sz) {
    res.status(404).json({ error: "Stambena zajednica nije pronađena" });
    return;
  }

  if (!sz.nbsFetchedAt) {
    try {
      const nbsData = await scrapeNbs(mb);
      if (nbsData) {
        const [updated] = await db
          .update(stambeneZajednice)
          .set({
            pib: nbsData.pib || sz.pib,
            racuni: nbsData.racuni.length > 0 ? nbsData.racuni : sz.racuni,
            nbsAdresa: nbsData.adresa,
            nbsMesto: nbsData.mesto,
            nbsOpstina: nbsData.opstina,
            postanskiBroj: nbsData.postanskiBroj,
            nbsFetchedAt: new Date(),
          })
          .where(eq(stambeneZajednice.id, sz.id))
          .returning();
        res.json(updated);
        return;
      }
    } catch {}
  }

  res.json(sz);
});

// GET /api/v1/sz/by-pib?pib=
router.get("/by-pib", async (req: ApiKeyRequest, res) => {
  const pib = req.query.pib as string;
  if (!pib) {
    res.status(400).json({ error: "PIB je obavezan" });
    return;
  }

  const [sz] = await db
    .select()
    .from(stambeneZajednice)
    .where(eq(stambeneZajednice.pib, pib))
    .limit(1);

  if (!sz) {
    res.status(404).json({ error: "Stambena zajednica nije pronađena" });
    return;
  }

  res.json(sz);
});

// GET /api/v1/sz/search?q=&limit=20
router.get("/search", async (req: ApiKeyRequest, res) => {
  const q = (req.query.q as string)?.trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50);

  if (!q || q.length < 2) {
    res.status(400).json({ error: "Upit mora imati bar 2 karaktera" });
    return;
  }

  const alt = getAlternateScript(q);
  const pattern = `%${q}%`;
  const altPattern = `%${alt}%`;

  if (/^\d+$/.test(q)) {
    const results = await db
      .select()
      .from(stambeneZajednice)
      .where(
        or(
          ilike(stambeneZajednice.maticniBroj, pattern),
          ilike(stambeneZajednice.pib, pattern)
        )
      )
      .limit(limit);
    res.json(results);
    return;
  }

  const results = await db
    .select()
    .from(stambeneZajednice)
    .where(
      or(
        ilike(stambeneZajednice.poslovnoIme, pattern),
        ilike(stambeneZajednice.poslovnoIme, altPattern)
      )
    )
    .limit(limit);

  res.json(results);
});

// GET /api/v1/sz/opstine
router.get("/opstine", async (_req, res) => {
  const result = await db
    .selectDistinct({ opstina: stambeneZajednice.opstina })
    .from(stambeneZajednice)
    .where(sql`${stambeneZajednice.opstina} IS NOT NULL`)
    .orderBy(stambeneZajednice.opstina);

  res.json(result.map((r) => r.opstina));
});

// GET /api/v1/sz/mesta?opstina=
router.get("/mesta", async (req, res) => {
  const opstina = req.query.opstina as string;
  if (!opstina) {
    res.status(400).json({ error: "Opština je obavezna" });
    return;
  }

  const result = await db
    .selectDistinct({ mesto: stambeneZajednice.mesto })
    .from(stambeneZajednice)
    .where(ilike(stambeneZajednice.opstina, opstina))
    .orderBy(stambeneZajednice.mesto);

  res.json(result.map((r) => r.mesto));
});

// GET /api/v1/sz/by-opstina?opstina=&mesto=&limit=50
router.get("/by-opstina", async (req: ApiKeyRequest, res) => {
  const opstina = req.query.opstina as string;
  const mesto = req.query.mesto as string;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);

  if (!opstina) {
    res.status(400).json({ error: "Opština je obavezna" });
    return;
  }

  const conditions = [ilike(stambeneZajednice.opstina, opstina)];
  if (mesto) conditions.push(ilike(stambeneZajednice.mesto, mesto));

  const results = await db
    .select()
    .from(stambeneZajednice)
    .where(and(...conditions))
    .limit(limit);

  res.json(results);
});

// POST /api/v1/sz/update
router.post("/update", async (req: ApiKeyRequest, res) => {
  const { maticniBroj, telefon, webSajt, emailAdresa, poslovnoIme, adresa, mesto, opstina } =
    req.body;

  if (!maticniBroj || !/^\d{8}$/.test(maticniBroj)) {
    res.status(400).json({ error: "Matični broj mora biti tačno 8 cifara" });
    return;
  }

  const [existing] = await db
    .select()
    .from(stambeneZajednice)
    .where(eq(stambeneZajednice.maticniBroj, maticniBroj))
    .limit(1);

  const updateData: Record<string, any> = {};
  if (telefon !== undefined) updateData.telefon = telefon;
  if (webSajt !== undefined) updateData.webSajt = webSajt;
  if (emailAdresa !== undefined) updateData.emailAdresa = emailAdresa;
  if (poslovnoIme !== undefined) updateData.poslovnoIme = poslovnoIme;
  if (adresa !== undefined) updateData.adresa = adresa;
  if (mesto !== undefined) updateData.mesto = mesto;
  if (opstina !== undefined) updateData.opstina = opstina;

  updateData.lastUpdatedByApiKey = req.apiKeyId;
  updateData.lastUpdatedAt = new Date();
  updateData.dataSource = req.apiKeyName || "api";

  if (existing) {
    const [updated] = await db
      .update(stambeneZajednice)
      .set(updateData)
      .where(eq(stambeneZajednice.id, existing.id))
      .returning();
    res.json(updated);
  } else {
    if (!poslovnoIme) {
      res.status(400).json({ error: "poslovnoIme je obavezno za novu SZ" });
      return;
    }
    const [created] = await db
      .insert(stambeneZajednice)
      .values({ maticniBroj, ...updateData })
      .returning();
    res.json(created);
  }
});

export default router;
