import * as cheerio from "cheerio";
import { toLatin } from "../utils/transliterate.js";

const NBS_URL =
  "https://webappcenter.nbs.rs/pnwebapp/EnforcedCollectionDebtor/EnforcedCollectionDebtor";

export interface BlockadePeriod {
  od: string | null;
  do: string | null;
  brojDana: number;
  aktivna: boolean;
}

export interface BlockadeResult {
  maticniBroj: string;
  uBlokadi: boolean;
  iznosBlokade: string | null;
  iznosBlokadeRsd: number | null;
  danaAktivneBlokade: number;
  ukupnoDanaBlokade: number;
  periodi: BlockadePeriod[];
  naziv: string | null;
  adresa: string | null;
  mesto: string | null;
  pib: string | null;
  greska: string | null;
}

function prazanRezultat(maticniBroj: string, greska: string | null = null): BlockadeResult {
  return {
    maticniBroj,
    uBlokadi: false,
    iznosBlokade: null,
    iznosBlokadeRsd: null,
    danaAktivneBlokade: 0,
    ukupnoDanaBlokade: 0,
    periodi: [],
    naziv: null,
    adresa: null,
    mesto: null,
    pib: null,
    greska,
  };
}

function norm(text: string): string {
  return toLatin(text)
    .toLowerCase()
    .replace(/[đ]/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/:/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIznos(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return null;
  const broj = Number(cleaned.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(broj) ? null : broj;
}

function jeDatum(text: string): boolean {
  return /^\d{1,2}\.\s*\d{1,2}\.\s*\d{4}\.?$/.test(text.trim());
}

type Red = string[];

function ucitajRedove($: cheerio.CheerioAPI): Red[] {
  const redovi: Red[] = [];
  $("tr").each((_, tr) => {
    const celije: string[] = [];
    $(tr)
      .find("td, th")
      .each((__, cell) => {
        celije.push($(cell).text().replace(/\s+/g, " ").trim());
      });
    if (celije.length > 0) redovi.push(celije);
  });
  return redovi;
}

const POLJA: Record<string, keyof BlockadeResult> = {
  duznik: "naziv",
  adresa: "adresa",
  mesto: "mesto",
  "maticni broj": "maticniBroj",
  "poreski broj": "pib",
};

function citajIdentitet(redovi: Red[], rezultat: BlockadeResult): boolean {
  for (let i = 0; i < redovi.length - 1; i++) {
    const labele = redovi[i].map(norm);
    if (!labele.includes("maticni broj")) continue;

    const vrednosti = redovi[i + 1];
    labele.forEach((labela, index) => {
      const vrednost = vrednosti[index]?.trim();
      if (!vrednost) return;

      if (labela === "ukupan iznos blokade") {
        rezultat.iznosBlokade = toLatin(vrednost);
        rezultat.iznosBlokadeRsd = parseIznos(vrednost);
        return;
      }

      const polje = POLJA[labela];
      if (polje) (rezultat as any)[polje] = toLatin(vrednost);
    });

    return true;
  }
  return false;
}

function citajPeriode(redovi: Red[]): BlockadePeriod[] {
  const periodi: BlockadePeriod[] = [];
  const videni = new Set<string>();

  for (let i = 0; i < redovi.length; i++) {
    const zaglavlje = redovi[i].map(norm);
    if (zaglavlje[0] !== "od" || zaglavlje[1] !== "do") continue;

    for (let j = i + 1; j < redovi.length; j++) {
      const celije = redovi[j];
      if (celije.length < 3) break;
      if (celije.some((c) => norm(c).startsWith("ukupno"))) break;
      if (!jeDatum(celije[0])) break;

      const kljuc = `${celije[0]}|${celije[1]}|${celije[2]}`;
      if (videni.has(kljuc)) continue;
      videni.add(kljuc);

      const doDatum = jeDatum(celije[1]) ? celije[1] : null;
      periodi.push({
        od: celije[0],
        do: doDatum,
        brojDana: Number(celije[2].replace(/\D/g, "")) || 0,
        aktivna: doDatum === null,
      });
    }
  }

  return periodi;
}

export async function proveriBlokadu(maticniBroj: string): Promise<BlockadeResult> {
  const params = new URLSearchParams({
    isSearchExecuted: "true",
    NationalCode: maticniBroj,
    TaxCode: "",
    OrderBy: "NationalCode",
  });

  let html: string;
  try {
    const res = await fetch(`${NBS_URL}?${params}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return prazanRezultat(maticniBroj, `NBS je vratio ${res.status}`);
    html = await res.text();
  } catch (err: any) {
    console.error(`Provera blokade nije uspela za ${maticniBroj}:`, err);
    return prazanRezultat(maticniBroj, err?.message || "NBS nije dostupan");
  }

  const redovi = ucitajRedove(cheerio.load(html));
  const rezultat = prazanRezultat(maticniBroj);

  if (!citajIdentitet(redovi, rezultat)) return rezultat;

  if (rezultat.maticniBroj !== maticniBroj) {
    return prazanRezultat(
      maticniBroj,
      `NBS je vratio drugi maticni broj (${rezultat.maticniBroj})`
    );
  }

  rezultat.periodi = citajPeriode(redovi);
  rezultat.ukupnoDanaBlokade = rezultat.periodi.reduce((zbir, p) => zbir + p.brojDana, 0);
  rezultat.danaAktivneBlokade = rezultat.periodi
    .filter((p) => p.aktivna)
    .reduce((zbir, p) => zbir + p.brojDana, 0);
  rezultat.uBlokadi = rezultat.danaAktivneBlokade > 0;

  return rezultat;
}
