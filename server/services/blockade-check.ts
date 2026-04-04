import * as cheerio from "cheerio";
import { toLatin, hasCyrillic } from "../utils/transliterate.js";

interface BlockadeResult {
  maticniBroj: string;
  uBlokadi: boolean;
  iznosBlokade: string | null;
}

export async function proveriBlokadu(maticniBroj: string): Promise<BlockadeResult> {
  const url = "https://webappcenter.nbs.rs/PnWebApp/EnforcedCollectionDebtor/EnforcedCollectionDebtor";

  try {
    const getRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await getRes.text();
    const cookies = getRes.headers.getSetCookie?.() ?? [];
    const cookieStr = cookies.map((c) => c.split(";")[0]).join("; ");

    const $ = cheerio.load(html);
    const token = $('input[name="__RequestVerificationToken"]').val() as string;

    const postRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieStr,
        "User-Agent": "Mozilla/5.0",
      },
      body: new URLSearchParams({
        __RequestVerificationToken: token || "",
        txtMaticniBroj: maticniBroj,
      }).toString(),
    });

    const resultHtml = await postRes.text();
    const $r = cheerio.load(resultHtml);

    // Check for blockade info
    const resultText = $r("body").text();
    const hasBlockade = resultText.includes("блокад") || resultText.includes("blokad");

    let iznosBlokade: string | null = null;
    $r("table tr").each((_, row) => {
      const cells = $r(row).find("td");
      if (cells.length >= 2) {
        const label = $r(cells[0]).text().trim();
        if (label.includes("Износ") || label.includes("iznos")) {
          iznosBlokade = $r(cells[1]).text().trim() || null;
        }
      }
    });

    return {
      maticniBroj,
      uBlokadi: hasBlockade && iznosBlokade !== null,
      iznosBlokade: iznosBlokade && hasCyrillic(iznosBlokade) ? toLatin(iznosBlokade) : iznosBlokade,
    };
  } catch (err) {
    console.error(`Blockade check failed for ${maticniBroj}:`, err);
    return { maticniBroj, uBlokadi: false, iznosBlokade: null };
  }
}
