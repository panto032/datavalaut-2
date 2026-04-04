import https from "https";
import * as cheerio from "cheerio";
import { getPostalCode } from "../utils/postal-codes.js";
import { toLatin, hasCyrillic } from "../utils/transliterate.js";

interface NbsData {
  pib: string | null;
  racuni: string[];
  adresa: string | null;
  mesto: string | null;
  opstina: string | null;
  postanskiBroj: string | null;
}

function fetchNbsHtml(maticniBroj: string): Promise<string> {
  const url = `https://webappcenter.nbs.rs/PnWebApp/CompanyAccount/CompanyAccountResident?isSearchExecuted=true&CompanyNationalCode=${maticniBroj}&TypeID=1&Pagging.CurrentPage=1`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      rejectUnauthorized: false,
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sr,en;q=0.5",
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("NBS timeout")); });
  });
}

function clean(val: string | null): string | null {
  if (!val || val === "-" || val === "–") return null;
  return val;
}

export async function scrapeNbs(maticniBroj: string): Promise<NbsData | null> {
  try {
    console.log(`NBS scrape: preuzimanje za MB ${maticniBroj}...`);
    const html = await fetchNbsHtml(maticniBroj);
    const $ = cheerio.load(html);

    let pib: string | null = null;
    let adresa: string | null = null;
    let mesto: string | null = null;
    let opstina: string | null = null;
    const racuniSet = new Set<string>();

    // PIB
    $('td[data-title="Порески број"]').each((_, el) => {
      const val = $(el).text().trim();
      if (val && val !== "-") pib = val;
    });

    // Računi
    $('td[data-title="Рачун"]').each((_, el) => {
      const val = $(el).text().replace(/\s+/g, "").trim();
      if (val && val !== "-") racuniSet.add(val);
    });
    const racuni = Array.from(racuniSet);

    // Adresa, mesto, opština — uzmi iz prvog reda
    const adresaEl = $('td[data-title="Адреса"]').first();
    adresa = clean(adresaEl.length > 0 ? adresaEl.text().trim() : null);

    const mestoEl = $('td[data-title="Место"]').first();
    mesto = clean(mestoEl.length > 0 ? mestoEl.text().trim() : null);

    const opstinaEl = $('td[data-title="Општина"]').first();
    opstina = clean(opstinaEl.length > 0 ? opstinaEl.text().trim() : null);

    // Konvertuj ćirilicu u latinicu pre čuvanja
    if (adresa && hasCyrillic(adresa)) adresa = toLatin(adresa);
    if (mesto && hasCyrillic(mesto)) mesto = toLatin(mesto);
    if (opstina && hasCyrillic(opstina)) opstina = toLatin(opstina);

    console.log(`NBS scrape rezultat za ${maticniBroj}: PIB=${pib}, racuni=${racuni.length}, adresa=${adresa}, mesto=${mesto}, opstina=${opstina}`);

    if (!pib && racuni.length === 0) return null;

    const postanskiBroj = mesto ? getPostalCode(mesto) : null;

    return { pib, racuni, adresa, mesto, opstina, postanskiBroj };
  } catch (err) {
    console.error(`NBS scrape greška za ${maticniBroj}:`, err);
    return null;
  }
}
