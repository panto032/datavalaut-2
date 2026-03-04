# DataValaut

## Tech Stack
- React 18 + Vite
- Tailwind CSS za stilizovanje
- Lucide React za ikone

## Infrastruktura & Deploy
- **Deploy:** Coolify PaaS sa Nixpacks build packom (auto-detektuje tech stack)
- **Domen:** projekat dobija *.impulsee.dev subdomen automatski
- **VAŽNO za Nixpacks:**
  - package.json MORA imati "build" i "start" skripte
  - Za frontend (React/Vite): build → "vite build", start treba servirati dist/ folder
  - Za backend (Node/Express): start → "node server.js"
  - Port MORA biti 3000 (ili čitaj iz process.env.PORT)
  - Nixpacks čita package.json da odredi kako da builduje i pokrene app
- **Static site (React/Vite):** dodaj "serve" dependency i start script: "serve dist -s -l 3000"
  Ili koristi express static server. Nixpacks NEĆE automatski servirati statičke fajlove.
- **Environment varijable:** se dodaju kroz Coolify UI, ne hardkoduj tajne u kod
- **.gitignore:** node_modules/, dist/, .env - NIKAD ne komituj ove foldere
- **Git workflow:** commit + push na main → Coolify automatski deployuje

## Opšta pravila
- Jezik UI-ja: srpski (sr-Latn-RS)
- Mobile-first responsive dizajn
- Piši čist, čitljiv kod bez nepotrebnih komentara
- Referentni materijali (slike, dokumenti) su u _docs/ folderu

## Setup za deploy
- package.json scripts:
  "dev": "vite",
  "build": "vite build",
  "start": "serve dist -s -l 3000"
- Instaliraj serve: npm install serve
- Koristi funkcionalne komponente i React hooks
- Koristi Tailwind CSS klase, ne piši custom CSS
- Sav kod piši u src/ folderu
- Pokreni dev server sa: npm run dev (port 5173)

## Opis projekta
Pricamo o vome

## Gde smo stali
- 

## Šta treba uraditi
- 
