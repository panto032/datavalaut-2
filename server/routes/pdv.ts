import { Router } from "express";
import { apiKeyAuth } from "../middleware/api-key.js";
import { proveriPdv } from "../services/pdv-check.js";

const router = Router();

router.use(apiKeyAuth as any);

// GET /api/v1/pdv/check?pib=
router.get("/check", async (req, res) => {
  const pib = (req.query.pib as string)?.trim();

  if (!pib) {
    res.status(400).json({ error: "Obavezan je parametar: pib" });
    return;
  }
  if (!/^\d{9}$/.test(pib)) {
    res.status(400).json({ error: "PIB mora biti tačno 9 cifara" });
    return;
  }

  try {
    const result = await proveriPdv(pib);
    res.json({ izvor: "neoficijelno - scraping Poreske uprave (purs.gov.rs)", ...result });
  } catch (err: any) {
    console.error("PDV provera greška:", err);
    res.status(502).json({ error: "Servis Poreske uprave nedostupan" });
  }
});

export default router;
