import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";

interface Endpoint {
  method: string;
  path: string;
  description: string;
  params?: string;
  example?: string;
}

const sections: { title: string; base: string; endpoints: Endpoint[] }[] = [
  {
    title: "Pravna lica",
    base: "/api/v1/companies",
    endpoints: [
      {
        method: "GET",
        path: "/by-mb?mb=12345678",
        description: "Kompanija po matičnom broju. Auto NBS enrichment ako nije ranije dohvaćeno.",
        params: "mb (obavezno) — matični broj, 8 cifara",
        example: `curl -H "Authorization: Bearer sk_..." "https://api.example.com/api/v1/companies/by-mb?mb=12345678"`,
      },
      {
        method: "GET",
        path: "/search?q=naziv&limit=20",
        description: "Full-text pretraga po nazivu (ćirilica/latinica), matičnom broju ili PIB-u.",
        params: "q (obavezno, min 2 karaktera), limit (opciono, 1-50, default 20)",
      },
      {
        method: "POST",
        path: "/update",
        description: "Ažuriranje/kreiranje kompanije. Ako MB postoji — ažurira, ako ne — kreira (zahteva poslovnoIme).",
        params: "maticniBroj (obavezno), telefon, webSajt, emailAdresa, adresa, delatnostOpis, pib, poslovnoIme",
      },
    ],
  },
  {
    title: "Stambene zajednice",
    base: "/api/v1/sz",
    endpoints: [
      { method: "GET", path: "/by-mb?mb=", description: "SZ po matičnom broju + NBS enrichment" },
      { method: "GET", path: "/by-pib?pib=", description: "SZ po PIB-u" },
      { method: "GET", path: "/search?q=&limit=20", description: "Pretraga po nazivu" },
      { method: "GET", path: "/opstine", description: "Lista svih opština" },
      { method: "GET", path: "/mesta?opstina=", description: "Mesta u opštini" },
      { method: "GET", path: "/by-opstina?opstina=&mesto=&limit=50", description: "SZ filtrirane po lokaciji" },
      { method: "POST", path: "/update", description: "Ažuriranje/kreiranje SZ" },
    ],
  },
  {
    title: "Udruženja / Fondacije",
    base: "/api/v1/ngos",
    endpoints: [
      { method: "GET", path: "/by-mb?mb=", description: "NGO po matičnom broju + NBS enrichment" },
      { method: "GET", path: "/search?q=&limit=20", description: "Full-text pretraga" },
      { method: "POST", path: "/update", description: "Ažuriranje/kreiranje NGO" },
    ],
  },
  {
    title: "Finansijski izveštaji",
    base: "/api/v1/financial",
    endpoints: [
      {
        method: "GET",
        path: "/by-mb?mb=&godina=",
        description: "Izveštaj po matičnom broju. Bez godine — vraća sve godine.",
      },
    ],
  },
  {
    title: "Blokade",
    base: "/api/v1/blokade",
    endpoints: [
      {
        method: "GET",
        path: "/check?mb=",
        description: "Provera blokade u realnom vremenu (NBS, podatak se ne čuva).",
      },
    ],
  },
];

export function ApiDocsPage() {
  const [open, setOpen] = useState<number>(0);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopirano");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">API dokumentacija</h2>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-medium text-foreground">Autentifikacija</h3>
        <p className="text-sm text-muted-foreground">
          Svaki API poziv zahteva <code className="rounded bg-muted px-1">Authorization: Bearer sk_...</code> header.
          API ključ se kreira u sekciji "API ključevi".
        </p>
        <h3 className="mb-2 mt-4 font-medium text-foreground">Error kodovi</h3>
        <div className="text-sm text-muted-foreground">
          <p><code className="rounded bg-muted px-1">400</code> — Nevažeći parametri</p>
          <p><code className="rounded bg-muted px-1">401</code> — Nevažeći ili nedostajući API ključ</p>
          <p><code className="rounded bg-muted px-1">404</code> — Resurs nije pronađen</p>
          <p><code className="rounded bg-muted px-1">500</code> — Interna greška</p>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section, i) => (
          <div key={section.title} className="rounded-xl border border-border bg-card">
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="flex w-full items-center justify-between p-4"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">{section.title}</span>
                <code className="rounded bg-muted px-2 py-0.5 text-xs">{section.base}</code>
              </div>
              {open === i ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {open === i && (
              <div className="border-t border-border p-4 space-y-4">
                {section.endpoints.map((ep) => (
                  <div key={ep.path} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold ${
                          ep.method === "GET"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {ep.method}
                      </span>
                      <code className="text-sm font-medium">{section.base}{ep.path}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">{ep.description}</p>
                    {ep.params && (
                      <p className="text-xs text-muted-foreground">Parametri: {ep.params}</p>
                    )}
                    {ep.example && (
                      <div className="relative mt-2 rounded-lg bg-muted p-3">
                        <code className="text-xs">{ep.example}</code>
                        <button
                          onClick={() => copy(ep.example!)}
                          className="absolute right-2 top-2 rounded p-1 hover:bg-background"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
