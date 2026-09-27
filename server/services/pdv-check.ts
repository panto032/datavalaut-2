import * as cheerio from "cheerio";

const STRANICA_URL = "https://www.purs.gov.rs/sr/pravna-lica/pdv/registar.html";
const CAPTCHA_URL = "https://www.purs.gov.rs/srv/captcha";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface PdvCheckResult {
  pronadjen: boolean;
  pib: string;
  maticniBroj: string | null;
  naziv: string | null;
  adresa: string | null;
  mesto: string | null;
  opstina: string | null;
  status: string | null;
  pdvObveznik: boolean;
  pdvStatus: string | null;
  periodPrijava: string | null;
  datumUlaskaPdv: string | null;
}

function generisiKljuc(len = 32): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Sajt izdaje JSESSIONID na prvi GET — treba ga vratiti kroz sledeća dva poziva
// da bi "/srv/captcha" i pretraga bili u istoj sesiji.
async function otvoriSesiju(): Promise<string> {
  const res = await fetch(STRANICA_URL, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(20000),
  });
  const setCookie = res.headers.get("set-cookie");
  const match = setCookie?.match(/JSESSIONID=[^;]+/);
  if (!match) throw new Error("Poreska uprava nije vratila sesiju (JSESSIONID)");
  return match[0];
}

// QapTcha slajder na sajtu samo šalje nasumično ime polja na "/srv/captcha" i dobije
// ga natrag kao potvrdu — nema stvarne provere da je čovek povukao slajder.
async function potvrdiCaptchu(cookie: string): Promise<string> {
  const kljuc = generisiKljuc();
  const res = await fetch(CAPTCHA_URL, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
      Referer: STRANICA_URL,
    },
    body: new URLSearchParams({ action: "captcha", qaptcha_key: kljuc }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json();
  const vraceno = Array.isArray(data.qaptcha_key) ? data.qaptcha_key[0] : data.qaptcha_key;
  return vraceno || kljuc;
}

async function pretraziPib(pib: string, cookie: string, qaptcha: string): Promise<string> {
  const res = await fetch(STRANICA_URL, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
      Referer: STRANICA_URL,
    },
    body: new URLSearchParams({ pib, qaptcha }),
    signal: AbortSignal.timeout(20000),
  });
  return res.text();
}

function parsirajRezultat(html: string, pib: string): PdvCheckResult {
  const $ = cheerio.load(html);
  const praznoRez: PdvCheckResult = {
    pronadjen: false,
    pib,
    maticniBroj: null,
    naziv: null,
    adresa: null,
    mesto: null,
    opstina: null,
    status: null,
    pdvObveznik: false,
    pdvStatus: null,
    periodPrijava: null,
    datumUlaskaPdv: null,
  };

  if ($("#results .alert").text().includes("Није пронађен")) {
    return praznoRez;
  }

  function celijaIzTabele(selektor: string, labela: string): string | null {
    let vrednost: string | null = null;
    $(selektor)
      .find("tr")
      .each((_, el) => {
        const red = $(el);
        if (red.find("td.prva").text().trim() === labela) {
          vrednost = red.find("td.druga").text().trim() || null;
        }
      });
    return vrednost;
  }

  const pobSelektor = "#pob table";
  const pdvSelektor = "#pdvPodaci table:first";

  if (!$(pobSelektor).length) return praznoRez;

  const pdvStatus = celijaIzTabele(pdvSelektor, "Статус");

  return {
    pronadjen: true,
    pib,
    maticniBroj: celijaIzTabele(pobSelektor, "МБР"),
    naziv: celijaIzTabele(pobSelektor, "Назив"),
    adresa: celijaIzTabele(pobSelektor, "Адреса"),
    mesto: celijaIzTabele(pobSelektor, "Место"),
    opstina: celijaIzTabele(pobSelektor, "Општина"),
    status: celijaIzTabele(pobSelektor, "Статус"),
    pdvObveznik: /Активан/i.test(pdvStatus || ""),
    pdvStatus,
    periodPrijava: celijaIzTabele(pdvSelektor, "Период подношења ПДВ пријава"),
    datumUlaskaPdv: celijaIzTabele(pdvSelektor, "Датум уласка у ПДВ"),
  };
}

// Neoficijelna metoda — scraping javnog registra Poreske uprave (purs.gov.rs).
// Nema zvaničan API; sajt može promeniti markup/endpoint bez upozorenja.
export async function proveriPdv(pib: string): Promise<PdvCheckResult> {
  const cookie = await otvoriSesiju();
  const qaptcha = await potvrdiCaptchu(cookie);
  const html = await pretraziPib(pib, cookie, qaptcha);
  return parsirajRezultat(html, pib);
}
