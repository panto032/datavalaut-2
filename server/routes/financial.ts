import { Router } from "express";
import { db } from "../db/connection.js";
import { financialStatements } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { apiKeyAuth } from "../middleware/api-key.js";
import { latinize } from "../utils/transliterate.js";

const router = Router();

router.use(apiKeyAuth as any);

// GET /api/v1/financial/by-mb?mb=&godina=
router.get("/by-mb", async (req, res) => {
  const mb = req.query.mb as string;
  const godina = req.query.godina ? parseInt(req.query.godina as string) : undefined;

  if (!mb || !/^\d{8}$/.test(mb)) {
    res.status(400).json({ error: "Matični broj mora biti tačno 8 cifara" });
    return;
  }

  if (godina) {
    const [statement] = await db
      .select()
      .from(financialStatements)
      .where(
        and(
          eq(financialStatements.maticniBroj, mb),
          eq(financialStatements.godinaFi, godina)
        )
      )
      .limit(1);

    if (!statement) {
      res.status(404).json({ error: "Finansijski izveštaj nije pronađen" });
      return;
    }
    res.json(latinize(statement));
  } else {
    const results = await db
      .select()
      .from(financialStatements)
      .where(eq(financialStatements.maticniBroj, mb))
      .orderBy(desc(financialStatements.godinaFi));

    res.json(results.map(latinize));
  }
});

export default router;
