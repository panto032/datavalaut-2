import { Router } from "express";
import { apiKeyAuth } from "../middleware/api-key.js";
import { proveriBlokadu } from "../services/blockade-check.js";

const router = Router();

router.use(apiKeyAuth as any);

// GET /api/v1/blokade/check?mb=
router.get("/check", async (req, res) => {
  const mb = req.query.mb as string;
  if (!mb || !/^\d{8}$/.test(mb)) {
    res.status(400).json({ error: "Matični broj mora biti tačno 8 cifara" });
    return;
  }

  const result = await proveriBlokadu(mb);
  res.json(result);
});

export default router;
