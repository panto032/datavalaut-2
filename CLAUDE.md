# DataValaut

## Tech Stack
- React 18 + Vite + Tailwind CSS 4
- Express.js + Node.js backend
- PostgreSQL + Drizzle ORM
- Lucide React za ikone
- JWT auth + API ključevi

## Infrastruktura & Deploy
- **Deploy:** Coolify PaaS sa Nixpacks build packom (auto-detektuje tech stack)
- **Domen:** projekat dobija *.impulsee.dev subdomen automatski
- **VAŽNO za Nixpacks:**
  - package.json MORA imati "build" i "start" skripte
  - build → "vite build && tsc -p tsconfig.server.json"
  - start → "node dist-server/index.js" (Express servira API + frontend)
  - Port MORA biti 3000 (ili čitaj iz process.env.PORT)
- **Environment varijable:** DATABASE_URL, JWT_SECRET, PORT (dodaju se kroz Coolify UI)
- **.gitignore:** node_modules/, dist/, dist-server/, .env - NIKAD ne komituj
- **Git workflow:** commit + push na main → Coolify automatski deployuje

## Opšta pravila
- Jezik UI-ja: srpski (sr-Latn-RS)
- Mobile-first responsive dizajn
- Piši čist, čitljiv kod bez nepotrebnih komentara
- Referentni materijali (stari kod) su u _docs/ folderu

## Struktura projekta
- `server/` — Express backend (routes, services, middleware, db)
- `src/` — React frontend (admin panel)
- `server/db/schema.ts` — Drizzle PostgreSQL schema
- `server/routes/` — API endpointi (companies, sz, ngos, financial, blokade, auth, admin, api-keys)
- `server/services/` — NBS scraper, sync servisi (APR, NGO, eFaktura, Financial, SZ import)
- `server/middleware/` — JWT admin auth, API key auth
- `src/pages/` — Login, Dashboard, Search, Finansije, Blokade, API Keys, API Docs

## Scripts
- `npm run dev` — Vite (5173) + Express (3000) concurrently
- `npm run build` — Vite build + TypeScript compile server
- `npm start` — Production (Express servira sve na portu 3000)
- `npm run db:push` — Push schema to database

## Opis projekta
Srpska API platforma za poslovne registre — agregira podatke iz APR-a, NBS-a, eFakture. Admin panel + REST API.

## Gde smo stali
- Kompletna implementacija faze 1-5: server, baza, auth, API, admin panel, sync servisi
- Treba: deploy na Coolify, testiranje sa pravom bazom

## Šta treba uraditi
- Deploy na Coolify (Nixpacks)
- Kreirati PostgreSQL bazu u Coolify
- Podesiti environment varijable
- Testirati sve API endpointe

<!-- impulse-validator:pocetak -->
## Provera pre završetka rada (IMPULSE Validator)

Važi za svaki rad u ovom projektu. Odeljak održava `impulse-validator ukljuci` — ne menjaj ga ručno.

1. **Pre nego što javiš da je posao gotov**, pokreni:
   ```
   impulse-validator zavrsi .
   ```
   Obim bira sama: izmenjena samo dokumentacija → bez provere; izmenjen kod → provera sa build-om (bez testova i pokretanja aplikacije).
2. **Ne javljaj „gotovo" dok presuda nije 🟢 MOŽE ili 🟡 UPOZORENJA bez novih problema.** Nove kritične greške i upozorenja koje je tvoj rad napravio popravi, pa pokreni ponovo.
3. **Nalaz koji smatraš pogrešnim ili namernim** ne rešavaj menjanjem koda niti isključivanjem pravila — upiši ga u `_docs/validator/oboreno.json` sa razlogom i dokazom (fajl, linija, zašto).
4. **Posle svakog tvog rada** Claude Code sam pušta brzu proveru i vraća ti nove probleme (najviše 3 kruga).
5. **Pre push-a** git kuka pušta kompletnu proveru (build, testovi i pokretanje aplikacije ako je podešeno). STOP zaustavlja push; `git push --no-verify` samo uz odobrenje čoveka.
6. Izveštaji su u `_docs/validator/` i ne commituju se.
<!-- impulse-validator:kraj -->
