# Mapa projekta — DataValaut

## Arhitektura
- `server/index.ts` (posle build-a `dist-server/index.js`) — Express servira API + built frontend na portu 3000/PORT.
- `server/db/schema.ts` — Drizzle PostgreSQL šema. Entiteti: `users`, `companies`, `ngos`, `stambeneZajednice`, `financialStatements`, `apiKeys`, `syncJobs`.
- `server/routes/` — jedan router fajl po domenu (companies, ngos, sz, financial, blokade, sef, auth, admin, api-keys). Svi javni API routeri koriste `apiKeyAuth` middleware (`server/middleware/api-key.ts`).
- `server/services/` — dva tipa servisa:
  - **sync/scraper** servisi koji pune bazu u bulk-u (apr-sync, ngo-sync, sz-import, financial-sync, delatnosti-sync, efaktura-sync, nbs-scraper) — pišu u `syncJobs` tabelu status/progres.
  - **live check** servisi koji zovu eksterni javni servis on-demand po zahtevu (npr. `sef-check.ts`, `blockade-check.ts`) — nema baferovanja u bazi, samo prosleđuju rezultat.

## Primer "live check" pattern-a (za novi PDV servis se ugledati na ovo)
- `server/services/sef-check.ts` — poziva eFaktura javni API (`https://efaktura.mfin.gov.rs/api/publicApi/Company/CheckIfCompanyRegisteredOnEfaktura`), čist POST/JSON, bez captche.
- `server/routes/sef.ts` — `GET /api/v1/sef/check?mb=&pib=&jbkjs=`, validira ulaz, dopunjuje identifikatore iz baze (`companies` tabela), zove servis, mapira grešku u 502.
- Isti pattern važi za NBS scraping (`server/services/nbs-scraper.ts`) — plain HTTPS GET + cheerio parsing HTML-a, nema anti-bot zaštite na NBS strani.

## Konvencije
- Sve poruke/greške na srpskom (sr-Latn-RS), transliteracija ćirilice u latinicu kroz `server/utils/transliterate.ts` (`toLatin`, `hasCyrillic`) — koristi se i za NBS i za APR podatke.
- Matični broj: `varchar(8)`, validacija regex `/^\d{8}$/`.
- Nove kolone u `companies`/`ngos`/`sz` idu u sekcijama sa komentarom izvora (npr. `// eFaktura (SEF)`), plus `index()` ako se pretražuje po njoj.

## Pokretanje i provera
- `npm run dev` — Vite (5173) + Express (3000) paralelno.
- `npm run build` — vite build + tsc server.
- `npm run db:push` — push Drizzle šeme.
- Validacija: `impulse-validator zavrsi .` pre javljanja da je posao gotov (pravilo iz CLAUDE.md).

## "Live check" stranice u panelu (Blokade, PDV)
- Panel NE zove `/api/v1/...` (to je za spoljne korisnike API ključa) — zove poseban `/api/admin/...` endpoint sa JWT admin auth, definisan u `server/routes/admin.ts`, koji iznutra zove isti servis.
- Primer: PDV → `server/routes/admin.ts` (`GET /api/admin/pdv?pib=`) + `src/pages/pdv/page.tsx` (`PdvPage`) + ruta `/pdv` u `src/App.tsx` + link u `src/components/layout/sidebar.tsx`. Isti trojni pattern kao Blokade (`/api/admin/blokade`, `BlokadePage`, `/blokade`).
- Za spoljnu upotrebu (korisnik ugrađuje u svoj softver) dokumentovati u `src/pages/api-docs/page.tsx` → `sections` niz, sekcija sa `base` (npr. `/api/v1/pdv`) i `endpoints` (curl primer sa `Authorization: Bearer sk_...`).

## Zamke
- **Poreska uprava PDV registar (purs.gov.rs) NIJE kao NBS** — ima klijentski anti-bot slajder (QapTcha jQuery plugin), pravi POST na `/srv/captcha` sa session cookie-jem pre stvarnog upita. Vidi `docs/agent/STANJE.md` za detalje mehanizma i pravni caveat pre implementacije.
