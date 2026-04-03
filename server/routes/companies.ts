import { Router } from "express";
import { db } from "../db/connection.js";
import { companies } from "../db/schema.js";
import { eq, ilike, or, sql } from "drizzle-orm";
import { apiKeyAuth, ApiKeyRequest } from "../middleware/api-key.js";
import { scrapeNbs } from "../services/nbs-scraper.js";
import { getAlternateScript, latinize } from "../utils/transliterate.js";

const router = Router();

router.use(apiKeyAuth as any);

// GET /api/v1/companies/by-mb?mb=12345678
router.get("/by-mb", async (req: ApiKeyRequest, res) => {
  const mb = req.query.mb as string;
  if (!mb || !/^\d{8}$/.test(mb)) {
    res.status(400).json({ error: "Matični broj mora biti tačno 8 cifara" });
    return;
  }

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.maticniBroj, mb))
    .limit(1);

  if (!company) {
    res.status(404).json({ error: "Kompanija nije pronađena" });
    return;
  }

  // Auto NBS enrichment if not yet done
  if (!company.nbsFetchedAt) {
    try {
      const nbsData = await scrapeNbs(mb);
      if (nbsData) {
        const [updated] = await db
          .update(companies)
          .set({
            pib: nbsData.pib || company.pib,
            racuni: nbsData.racuni.length > 0 ? nbsData.racuni : company.racuni,
            nbsAdresa: nbsData.adresa,
            nbsMesto: nbsData.mesto,
            nbsOpstina: nbsData.opstina,
            postanskiBroj: nbsData.postanskiBroj,
            nbsFetchedAt: new Date(),
          })
          .where(eq(companies.id, company.id))
          .returning();
        res.json(latinize(updated));
        return;
      }
    } catch {
      // Return existing data if NBS fails
    }
  }

  res.json(latinize(company));
});

// GET /api/v1/companies/search?q=naziv&limit=20
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

  // Check if numeric — search by matični broj or PIB
  if (/^\d+$/.test(q)) {
    const results = await db
      .select()
      .from(companies)
      .where(
        or(
          ilike(companies.maticniBroj, pattern),
          ilike(companies.pib, pattern)
        )
      )
      .limit(limit);
    res.json(results.map(latinize));
    return;
  }

  const results = await db
    .select()
    .from(companies)
    .where(
      or(
        ilike(companies.poslovnoIme, pattern),
        ilike(companies.poslovnoIme, altPattern)
      )
    )
    .limit(limit);

  res.json(results.map(latinize));
});

// POST /api/v1/companies/update
router.post("/update", async (req: ApiKeyRequest, res) => {
  const { maticniBroj, telefon, webSajt, emailAdresa, adresa, delatnostOpis, pib, poslovnoIme } =
    req.body;

  if (!maticniBroj || !/^\d{8}$/.test(maticniBroj)) {
    res.status(400).json({ error: "Matični broj mora biti tačno 8 cifara" });
    return;
  }

  const [existing] = await db
    .select()
    .from(companies)
    .where(eq(companies.maticniBroj, maticniBroj))
    .limit(1);

  const updateData: Record<string, any> = {};
  if (telefon !== undefined) updateData.telefon = telefon;
  if (webSajt !== undefined) updateData.webSajt = webSajt;
  if (emailAdresa !== undefined) updateData.emailAdresa = emailAdresa;
  if (adresa !== undefined) updateData.adresa = adresa;
  if (delatnostOpis !== undefined) updateData.delatnostOpis = delatnostOpis;
  if (pib !== undefined) updateData.pib = pib;
  if (poslovnoIme !== undefined) updateData.poslovnoIme = poslovnoIme;

  updateData.lastUpdatedByApiKey = req.apiKeyId;
  updateData.lastUpdatedAt = new Date();
  updateData.kontaktAzuriranAt = new Date();
  updateData.dataSource = req.apiKeyName || "api";

  if (existing) {
    const [updated] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, existing.id))
      .returning();
    res.json(latinize(updated));
  } else {
    if (!poslovnoIme) {
      res.status(400).json({ error: "poslovnoIme je obavezno za novu kompaniju" });
      return;
    }
    const [created] = await db
      .insert(companies)
      .values({ maticniBroj, ...updateData })
      .returning();
    res.json(latinize(created));
  }
});

export default router;
