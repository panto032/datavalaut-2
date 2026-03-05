import { Router } from "express";
import { db } from "../db/connection.js";
import { companies, ngos, stambeneZajednice, financialStatements, syncJobs } from "../db/schema.js";
import { adminAuth } from "../middleware/admin-auth.js";
import { sql, desc, eq, ilike, or, and } from "drizzle-orm";
import { getAlternateScript, toLatin, hasCyrillic } from "../utils/transliterate.js";
import { proveriBlokadu } from "../services/blockade-check.js";
import { scrapeNbs } from "../services/nbs-scraper.js";
import { startAprSync } from "../services/apr-sync.js";
import { startNgoSync } from "../services/ngo-sync.js";
import { startEfakturaSync } from "../services/efaktura-sync.js";
import { startFinancialSync } from "../services/financial-sync.js";
import { startSzImport } from "../services/sz-import.js";
import { startDelatnostiSync } from "../services/delatnosti-sync.js";

const router = Router();

router.use(adminAuth as any);

// Transliteracija ćirilice u latinicu za sve string polja
function latinize<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj as any)) {
    if (typeof value === "string" && hasCyrillic(value)) {
      result[key] = toLatin(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) => (typeof v === "string" && hasCyrillic(v) ? toLatin(v) : v));
    } else {
      result[key] = value;
    }
  }
  return result;
}

// GET /api/admin/stats
router.get("/stats", async (_req, res) => {
  const [companyCount] = await db.select({ count: sql<number>`count(*)` }).from(companies);
  const [companyWithPib] = await db
    .select({ count: sql<number>`count(*)` })
    .from(companies)
    .where(sql`${companies.pib} IS NOT NULL`);
  const [companyWithKontakt] = await db
    .select({ count: sql<number>`count(*)` })
    .from(companies)
    .where(
      sql`${companies.telefon} IS NOT NULL OR ${companies.emailAdresa} IS NOT NULL OR ${companies.webSajt} IS NOT NULL`
    );
  const [ngoCount] = await db.select({ count: sql<number>`count(*)` }).from(ngos);
  const [szCount] = await db.select({ count: sql<number>`count(*)` }).from(stambeneZajednice);
  const [fiCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(financialStatements);

  res.json({
    companies: Number(companyCount.count),
    companiesWithPib: Number(companyWithPib.count),
    companiesWithKontakt: Number(companyWithKontakt.count),
    ngos: Number(ngoCount.count),
    stambeneZajednice: Number(szCount.count),
    financialStatements: Number(fiCount.count),
  });
});

// GET /api/admin/sync-jobs
router.get("/sync-jobs", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const jobs = await db
    .select()
    .from(syncJobs)
    .orderBy(desc(syncJobs.startedAt))
    .limit(limit);
  res.json(jobs);
});

// GET /api/admin/me
router.get("/me", async (req: any, res) => {
  res.json({ userId: req.adminId });
});

// Admin search endpoints (no API key needed, just admin JWT)
// GET /api/admin/search/companies?q=&limit=30
router.get("/search/companies", async (req, res) => {
  const q = (req.query.q as string)?.trim();
  const limit = Math.min(parseInt(req.query.limit as string) || 30, 50);
  if (!q || q.length < 2) { res.json([]); return; }

  const alt = getAlternateScript(q);
  const pattern = `%${q}%`;
  const altPattern = `%${alt}%`;

  if (/^\d+$/.test(q)) {
    const results = await db.select().from(companies)
      .where(or(ilike(companies.maticniBroj, pattern), ilike(companies.pib, pattern)))
      .limit(limit);
    res.json(results.map(latinize));
    return;
  }

  const results = await db.select().from(companies)
    .where(or(ilike(companies.poslovnoIme, pattern), ilike(companies.poslovnoIme, altPattern)))
    .limit(limit);
  res.json(results.map(latinize));
});

// GET /api/admin/search/ngos?q=&limit=30
router.get("/search/ngos", async (req, res) => {
  const q = (req.query.q as string)?.trim();
  const limit = Math.min(parseInt(req.query.limit as string) || 30, 50);
  if (!q || q.length < 2) { res.json([]); return; }

  const alt = getAlternateScript(q);
  const pattern = `%${q}%`;
  const altPattern = `%${alt}%`;

  if (/^\d+$/.test(q)) {
    const results = await db.select().from(ngos)
      .where(or(ilike(ngos.maticniBroj, pattern), ilike(ngos.pib, pattern)))
      .limit(limit);
    res.json(results.map(latinize));
    return;
  }

  const results = await db.select().from(ngos)
    .where(or(ilike(ngos.naziv, pattern), ilike(ngos.naziv, altPattern)))
    .limit(limit);
  res.json(results.map(latinize));
});

// GET /api/admin/search/sz?q=&limit=30
router.get("/search/sz", async (req, res) => {
  const q = (req.query.q as string)?.trim();
  const limit = Math.min(parseInt(req.query.limit as string) || 30, 50);
  if (!q || q.length < 2) { res.json([]); return; }

  const alt = getAlternateScript(q);
  const pattern = `%${q}%`;
  const altPattern = `%${alt}%`;

  if (/^\d+$/.test(q)) {
    const results = await db.select().from(stambeneZajednice)
      .where(or(
        ilike(stambeneZajednice.maticniBroj, pattern),
        ilike(stambeneZajednice.pib, pattern)
      ))
      .limit(limit);
    res.json(results.map(latinize));
    return;
  }

  const results = await db.select().from(stambeneZajednice)
    .where(or(
      ilike(stambeneZajednice.poslovnoIme, pattern),
      ilike(stambeneZajednice.poslovnoIme, altPattern)
    ))
    .limit(limit);
  res.json(results.map(latinize));
});

// GET /api/admin/financial?mb=
router.get("/financial", async (req, res) => {
  const mb = req.query.mb as string;
  if (!mb || !/^\d{8}$/.test(mb)) {
    res.status(400).json({ error: "Matični broj mora biti tačno 8 cifara" });
    return;
  }
  const results = await db.select().from(financialStatements)
    .where(eq(financialStatements.maticniBroj, mb))
    .orderBy(desc(financialStatements.godinaFi));
  res.json(results);
});

// GET /api/admin/blokade?mb=
router.get("/blokade", async (req, res) => {
  const mb = req.query.mb as string;
  if (!mb || !/^\d{8}$/.test(mb)) {
    res.status(400).json({ error: "Matični broj mora biti tačno 8 cifara" });
    return;
  }
  const result = await proveriBlokadu(mb);
  res.json(result);
});

// POST /api/admin/enrich-nbs — NBS obogaćivanje za admin panel
router.post("/enrich-nbs", async (req, res) => {
  const { maticniBroj, registry } = req.body;
  console.log("[NBS enrich] Primljen zahtev:", { maticniBroj, registry });
  if (!maticniBroj || !/^\d{8}$/.test(maticniBroj)) {
    console.log("[NBS enrich] Nevažeći MB:", maticniBroj);
    res.status(400).json({ error: "Matični broj mora biti tačno 8 cifara" });
    return;
  }

  try {
    const nbsData = await scrapeNbs(maticniBroj);
    console.log("[NBS enrich] Rezultat scrape-a:", nbsData);
    if (!nbsData) {
      res.json({ enriched: false, message: "NBS nema podatke za ovaj matični broj" });
      return;
    }

    const nbsFields = {
      pib: nbsData.pib,
      racuni: nbsData.racuni.length > 0 ? nbsData.racuni : undefined,
      nbsAdresa: nbsData.adresa,
      nbsMesto: nbsData.mesto,
      nbsOpstina: nbsData.opstina,
      postanskiBroj: nbsData.postanskiBroj,
      nbsFetchedAt: new Date(),
    };

    // Ukloni undefined polja
    const setData = Object.fromEntries(
      Object.entries(nbsFields).filter(([_, v]) => v !== undefined && v !== null)
    );

    let updated: any = null;

    if (registry === "ngos") {
      const [existing] = await db.select().from(ngos).where(eq(ngos.maticniBroj, maticniBroj)).limit(1);
      if (existing) {
        [updated] = await db.update(ngos).set(setData).where(eq(ngos.id, existing.id)).returning();
      }
    } else if (registry === "sz") {
      const [existing] = await db.select().from(stambeneZajednice).where(eq(stambeneZajednice.maticniBroj, maticniBroj)).limit(1);
      if (existing) {
        [updated] = await db.update(stambeneZajednice).set(setData).where(eq(stambeneZajednice.id, existing.id)).returning();
      }
    } else {
      const [existing] = await db.select().from(companies).where(eq(companies.maticniBroj, maticniBroj)).limit(1);
      if (existing) {
        [updated] = await db.update(companies).set(setData).where(eq(companies.id, existing.id)).returning();
      }
    }

    if (updated) {
      res.json({ enriched: true, data: latinize(updated) });
    } else {
      res.json({ enriched: false, message: "Entitet nije pronađen u bazi" });
    }
  } catch (err: any) {
    console.error("NBS enrich greška:", err);
    res.status(500).json({ error: "NBS servis nije dostupan" });
  }
});

// POST /api/admin/sync/apr — pozadinski proces
router.post("/sync/apr", async (_req, res) => {
  // Odmah vrati odgovor, sync ide u pozadini
  res.json({ ok: true, message: "APR sync pokrenut" });
  startAprSync().catch((err) => console.error("APR sync greška:", err));
});

// POST /api/admin/sync/ngo — pozadinski proces
router.post("/sync/ngo", async (_req, res) => {
  res.json({ ok: true, message: "NGO sync pokrenut" });
  startNgoSync().catch((err) => console.error("NGO sync greška:", err));
});

// POST /api/admin/sync/efaktura — pozadinski proces
router.post("/sync/efaktura", async (_req, res) => {
  if (!process.env.EFAKTURA_API_KEY) {
    res.status(400).json({ error: "EFAKTURA_API_KEY nije podešen u environment varijablama" });
    return;
  }
  res.json({ ok: true, message: "eFaktura sync pokrenut" });
  startEfakturaSync().catch((err) => console.error("eFaktura sync greška:", err));
});

// POST /api/admin/sync/financial — pozadinski proces
router.post("/sync/financial", async (_req, res) => {
  res.json({ ok: true, message: "Financial sync pokrenut" });
  startFinancialSync().catch((err) => console.error("Financial sync greška:", err));
});

// POST /api/admin/sync/sz-import
router.post("/sync/sz-import", async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records)) {
    res.status(400).json({ error: "records niz je obavezan" });
    return;
  }
  try {
    const jobId = await startSzImport(records);
    res.json({ ok: true, jobId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/sync/delatnosti — popuni opis delatnosti iz šifarnika
router.post("/sync/delatnosti", async (_req, res) => {
  res.json({ ok: true, message: "Delatnosti sync pokrenut" });
  startDelatnostiSync().catch((err) => console.error("Delatnosti sync greška:", err));
});

export default router;
