import { Router } from "express";
import { db } from "../db/connection.js";
import { companies } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { apiKeyAuth } from "../middleware/api-key.js";
import { proveriSef, SefIdentifikator } from "../services/sef-check.js";

const router = Router();

router.use(apiKeyAuth as any);

// GET /api/v1/sef/check?mb=&pib=&jbkjs=
router.get("/check", async (req, res) => {
  const mb = (req.query.mb as string)?.trim();
  const pib = (req.query.pib as string)?.trim();
  const jbkjs = (req.query.jbkjs as string)?.trim();

  if (!mb && !pib && !jbkjs) {
    res.status(400).json({ error: "Obavezan je bar jedan parametar: mb, pib ili jbkjs" });
    return;
  }
  if (mb && !/^\d{8}$/.test(mb)) {
    res.status(400).json({ error: "Matični broj mora biti tačno 8 cifara" });
    return;
  }

  const ident: SefIdentifikator = { maticniBroj: mb, pib, jbkjs };

  // Dopuni identifikatore iz baze — za budžetske korisnike je JBKJS jedini pouzdan ključ
  if (mb && !jbkjs) {
    const [company] = await db
      .select({ pib: companies.pib, jbkjs: companies.jbkjs })
      .from(companies)
      .where(eq(companies.maticniBroj, mb))
      .limit(1);

    if (company) {
      ident.pib = pib || company.pib || undefined;
      ident.jbkjs = company.jbkjs || undefined;
    }
  }

  try {
    const result = await proveriSef(ident);
    res.json({
      maticniBroj: mb || null,
      pib: ident.pib || null,
      jbkjs: ident.jbkjs || null,
      ...result,
    });
  } catch (err: any) {
    console.error("SEF provera greška:", err);
    res.status(502).json({ error: "eFaktura servis nedostupan" });
  }
});

export default router;
