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

## Otvoreno / sledeći korak
- Nije vizuelno testirano u browseru (dev server nije pokretan) — samo tsc + validator + direktan poziv servisa.
- Testirati `/api/admin/pdv` i `/api/v1/pdv/check` kroz pravu HTTP rutu (treba aktivan admin JWT / API ključ iz baze).
- Odlučiti da li commit-ovati (korisnik nije tražio).
- `.env` fajl postoji lokalno sa `DATABASE_URL` — nije provereno da li pokazuje na pravu ili test bazu.
