import { Router } from "express";
import { db } from "../db/connection.js";
import { ngos } from "../db/schema.js";
import { eq, ilike, or } from "drizzle-orm";
import { apiKeyAuth, ApiKeyRequest } from "../middleware/api-key.js";
import { scrapeNbs } from "../services/nbs-scraper.js";
import { getAlternateScript } from "../utils/transliterate.js";

const router = Router();

router.use(apiKeyAuth as any);

// GET /api/v1/ngos/by-mb?mb=
router.get("/by-mb", async (req: ApiKeyRequest, res) => {
  const mb = req.query.mb as string;
  if (!mb || !/^\d{8}$/.test(mb)) {
    res.status(400).json({ error: "Matični broj mora biti tačno 8 cifara" });
    return;
  }

  const [ngo] = await db
    .select()
    .from(ngos)
    .where(eq(ngos.maticniBroj, mb))
    .limit(1);

  if (!ngo) {
    res.status(404).json({ error: "Udruženje nije pronađeno" });
    return;
  }

  if (!ngo.nbsFetchedAt) {
    try {
      const nbsData = await scrapeNbs(mb);
      if (nbsData) {
        const [updated] = await db
          .update(ngos)
          .set({
            pib: nbsData.pib || ngo.pib,
            racuni: nbsData.racuni.length > 0 ? nbsData.racuni : ngo.racuni,
            nbsAdresa: nbsData.adresa,
            nbsMesto: nbsData.mesto,
            nbsOpstina: nbsData.opstina,
            postanskiBroj: nbsData.postanskiBroj,
            nbsFetchedAt: new Date(),
          })
          .where(eq(ngos.id, ngo.id))
          .returning();
        res.json(updated);
        return;
      }
    } catch {}
  }

  res.json(ngo);
});

// GET /api/v1/ngos/search?q=&limit=20
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
      .from(ngos)
      .where(
        or(
          ilike(ngos.maticniBroj, pattern),
          ilike(ngos.pib, pattern)
        )
      )
      .limit(limit);
    res.json(results);
    return;
  }

  const results = await db
    .select()
    .from(ngos)
    .where(
      or(
        ilike(ngos.naziv, pattern),
        ilike(ngos.naziv, altPattern)
      )
    )
    .limit(limit);

  res.json(results);
});

// POST /api/v1/ngos/update
router.post("/update", async (req: ApiKeyRequest, res) => {
  const { maticniBroj, telefon, webSajt, emailAdresa, adresa, naziv } = req.body;

  if (!maticniBroj || !/^\d{8}$/.test(maticniBroj)) {
    res.status(400).json({ error: "Matični broj mora biti tačno 8 cifara" });
    return;
  }

  const [existing] = await db
    .select()
    .from(ngos)
    .where(eq(ngos.maticniBroj, maticniBroj))
    .limit(1);

  const updateData: Record<string, any> = {};
  if (telefon !== undefined) updateData.telefon = telefon;
  if (webSajt !== undefined) updateData.webSajt = webSajt;
  if (emailAdresa !== undefined) updateData.emailAdresa = emailAdresa;
  if (adresa !== undefined) updateData.adresa = adresa;
  if (naziv !== undefined) updateData.naziv = naziv;

  updateData.lastUpdatedByApiKey = req.apiKeyId;
  updateData.lastUpdatedAt = new Date();
  updateData.dataSource = req.apiKeyName || "api";

  if (existing) {
    const [updated] = await db
      .update(ngos)
      .set(updateData)
      .where(eq(ngos.id, existing.id))
      .returning();
    res.json(updated);
  } else {
    if (!naziv) {
      res.status(400).json({ error: "naziv je obavezan za novo udruženje" });
      return;
    }
    const [created] = await db
      .insert(ngos)
      .values({ maticniBroj, ...updateData })
      .returning();
    res.json(created);
  }
});

export default router;
