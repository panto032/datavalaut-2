# Stanje — DataValaut

## Trenutni zadatak
PDV provera (Poreska uprava, purs.gov.rs) je **gotova**: servis + API ruta (za spoljnu integraciju preko API ključa) + admin panel stranica. Fajlovi NISU komitovani (korisnik nije tražio commit).

Korisnik je naglasio da DataValaut koristi samo na svojim projektima, ne globalno — zato je rizik od scraping-a anti-bot zaštite prihvatljiv za ovu (test) implementaciju.

## Šta je potvrđeno (2026-09-27)
- Postoji javan, besplatan registar: `https://www.purs.gov.rs/sr/pravna-lica/pdv/registar.html` — pretraga po PIB-u, bez login-a.
- Rezultat vraća: naziv, PIB, matični broj, adresu, datum ulaska u sistem PDV, status (aktivan/brisan).
- Forma: `<form name="pibQuery" action="" method="post">` na istom URL-u, sadrži skriveno polje `qaptcha` (id `antiRobotAnswer`) — anti-bot mehanizam pre stvarnog upita.
- Mehanizam anti-bota (QapTcha jQuery plugin, `/assets/front/plugins/qaptcha/QapTcha.jquery.js`):
  1. Klijent generiše nasumično ime hidden inputa (32 char) i vrednost (7 char) — čisto DOM, ništa se ne šalje.
  2. Kad se slajder povuče do kraja, JS radi `POST /srv/captcha` sa `{action: 'captcha', qaptcha_key: <generisano ime>}` — sesija se čuva kroz `JSESSIONID` cookie (Apache/Tomcat, `Set-Cookie: JSESSIONID=...; HttpOnly; Secure`).
  3. Server vrati JSON sa `qaptcha_key` (PHP endpoint `/srv/captcha` — verovatno vezuje vrednost za PHP sesiju).
  4. Klijent upiše vraćeni `qaptcha_key` u vidljivo polje `qaptcha` i tek tad POST-uje `pibQuery` formu sa `pib=...&qaptcha=...` koristeći ISTU sesiju.
  - Nema slike/OCR captche — to je samo "prevari server da si čovek jednim dodatnim POST pozivom u istoj sesiji". Tehnički trivijalno automatizovati (2 HTTP poziva sa cookie jar-om), ali je **eksplicitno postavljeno da spreči automatske upite** — za razliku od NBS servisa (`nbs-scraper.ts`) koji nema nikakvu anti-bot zaštitu.
  - Plain GET sa `?pib=...` u query stringu SAMO popuni input polje, ne vraća rezultat (probao — `curl` GET vraća formu bez tabele rezultata).
  - `robots.txt` na purs.gov.rs vraća 404 (nema explicitnog Disallow), ali to ne znači da je scraping dozvoljen po ToS.

## Šta je urađeno (implementacija)
- Potvrđeno da NE postoji zvaničan API/bulk export (CSV/XML) od Poreske uprave — provereno data.gov.rs i sajt; samo ova jedna web forma postoji.
- `server/services/pdv-check.ts` — `proveriPdv(pib)`: GET stranice → uzme `JSESSIONID` cookie → POST `/srv/captcha` (echo endpoint, ne provera slajdera) → POST na istu stranicu sa `pib` + `qaptcha` → cheerio parsira `#pob` (opšti podaci) i `#pdvPodaci table:first` (PDV status/period/datum). Vraća `pronadjen: false` ako ima `.alert` sa "Није пронађен".
- `server/routes/pdv.ts` — `GET /api/v1/pdv/check?pib=` (9 cifara), `apiKeyAuth`, odgovor sadrži `izvor: "neoficijelno - scraping..."`.
- Mount-ovano u `server/index.ts` (`/api/v1/pdv`).
- **Testirano direktnim pozivom `proveriPdv()` (tsx skripta, obrisana posle) — sva tri slučaja potvrđena:**
  1. PIB 106411671 (CRI DOMAINS DOO) — registrovan PDV obveznik → `pdvObveznik: true`, status "Активан", period "3 месечни", datum ulaska "11.01.2011.".
  2. PIB 115646515 (Ivana Pantelić pr IMPULSE WEB) — firma postoji, status "Активан", ali NIJE PDV obveznik → `pdvObveznik: false, pdvStatus: null` (kod je ovo pogodio ispravno bez izmena).
  3. PIB 999999999 (ne postoji) → `pronadjen: false`.
- **Frontend integracija (za panel):** `server/routes/admin.ts` dobio `GET /api/admin/pdv?pib=` (JWT admin auth, isti pattern kao `/api/admin/blokade`) → poziva `proveriPdv`. Nova stranica `src/pages/pdv/page.tsx` (`PdvPage`, po uzoru na `BlokadePage`), ruta `/pdv` u `src/App.tsx`, link u `src/components/layout/sidebar.tsx` ("PDV provera", ikonica `Percent`).
- **API dokumentacija:** dodata sekcija "PDV" u `src/pages/api-docs/page.tsx` (`/api/v1/pdv/check?pib=` sa curl primerom) — ovo je put za korisnika da PDV proveru ugradi u SVOJ softver preko API ključa.
- `impulse-validator zavrsi .` → 🟡 UPOZORENJA, 0 kritičnih, **0 novih** u odnosu na prethodnu proveru; oba upozorenja su prethodno postojeća (JWT_SECRET default u `admin-auth.ts`, nedostatak `.env.example`) i ne tiču se ovog rada. `tsc` (server i frontend) prolazi čisto.

## Commit + push (2026-09-27)
- Commitovano (`a87f4c6`, "Dodaj proveru PDV obveznika (Poreska uprava)") i push-ovano na `main` — pre-push git kuka (kompletna provera) prošla: 🟡 upozorenja, 0 kritičnih, ista 2 preexisting upozorenja.
- **NAMERNO izostavljeno iz commit-a:** `server/services/blockade-check.ts` — imao je veliku izmenu (173+/45-) koja je postojala PRE početka ovog zadatka (bila je u git status-u na početku sesije), nepovezana sa PDV radom. Ostaje uncommitted, treba pitati korisnika šta je to i da li da se commituje posebno.
- Coolify će auto-deployovati sa main branch-a (po CLAUDE.md workflow-u).

## Otvoreno / sledeći korak
- **Vizuelni test u browseru NIJE uspeo** — lokalni `.env` DATABASE_URL pokazuje na Coolify interni hostname (npr. `wkg4ss4g8wwswo4o44wkocwc`) koji nije dostupan sa ove mašine van Coolify mreže → Express se ruši na svaki DB poziv (probano: login, `pg-pool ENOTFOUND`). Probao izolovanu instancu (Express :3099, Vite :5180, van postojećih dev servera na :3000/:5173-5175 koje NISAM dirao) — isti DB problem. Kod je ipak validiran: tsc čist, validator čist (0 novih), servis direktno testiran sa 3 realna PIB-a (vidi gore).
- Kad se deployuje na Coolify (prava baza), vizuelno proveriti `/pdv` stranicu u panelu — stilovi/prikaz nisu nikad vizuelno potvrđeni.
- Pitati korisnika za `server/services/blockade-check.ts` (nepovezane necommitovane izmene).

## Popravka validator upozorenja (2026-09-27, posle push-a)
- Pre-push kuka je vratila 2 upozorenja (V-15C822 JWT_SECRET default, V-C6724B nema .env.example) — ista koja su bila preexisting.
- `server/middleware/admin-auth.ts` — uklonjen `|| "dev-secret-change-in-production"` fallback, server sad baca grešku na startu ako `JWT_SECRET` nije podešen (TS trik: `const jwtSecretEnv` pa `if (!jwtSecretEnv) throw` pa `const JWT_SECRET: string = jwtSecretEnv` — direktno narrowing preko zatvaranja funkcije ne radi u TS-u).
- Napravljen `.env.example` sa 4 varijable (DATABASE_URL, JWT_SECRET, EFAKTURA_API_KEY, PORT).
- `impulse-validator proveri . --samo V-15C822,V-C6724B --okidac agent` → oba zatvorena, 0 novih.
- **VAŽNO za deploy:** `JWT_SECRET` sad MORA biti postavljen u Coolify environment varijablama, inače će produkcija pucati na startu (ranije je tiho radila sa default vrednošću).
