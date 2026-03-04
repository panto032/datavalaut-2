import { useState, useEffect } from "react";
import {
  Search,
  Building2,
  Users,
  Home,
  Loader2,
  MapPin,
  CreditCard,
  Landmark,
  Calendar,
  Activity,
  Globe,
  Phone,
  Mail,
  Banknote,
  RefreshCw,
  ChevronRight,
  X,
} from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";

type Registry = "companies" | "ngos" | "sz";

const fieldLabels: Record<string, string> = {
  maticniBroj: "Matični broj",
  poslovnoIme: "Poslovno ime",
  naziv: "Naziv",
  pib: "PIB",
  nazivStatusa: "Status",
  nazivPravneForme: "Pravna forma",
  sifraDelatnosti: "Šifra delatnosti",
  delatnostOpis: "Opis delatnosti",
  datumOsnivanja: "Datum osnivanja",
  datumRegistracije: "Datum registracije",
  nazivOpstine: "Opština (APR)",
  sifraOpstine: "Šifra opštine",
  // NBS
  nbsAdresa: "Adresa (NBS)",
  nbsMesto: "Mesto (NBS)",
  nbsOpstina: "Opština (NBS)",
  postanskiBroj: "Poštanski broj",
  racuni: "Računi u banci",
  adresa: "Adresa",
  // NGO specific
  tipLica: "Tip lica",
  oblastiCiljeva: "Oblasti ciljeva",
  sifraMesta: "Šifra mesta",
  // SZ specific
  mesto: "Mesto",
  opstina: "Opština",
  // Contact
  telefon: "Telefon",
  emailAdresa: "Email",
  webSajt: "Web sajt",
  // Tracking
  dataSource: "Izvor podataka",
  nbsFetchedAt: "NBS preuzeto",
  lastUpdatedAt: "Poslednja izmena",
  createdAt: "Kreirano",
};

// Polja koja se prikazuju po sekcijama
const companySections = [
  {
    title: "Osnovni podaci",
    icon: Building2,
    fields: ["maticniBroj", "poslovnoIme", "pib", "nazivStatusa", "nazivPravneForme", "sifraDelatnosti", "delatnostOpis", "datumOsnivanja"],
  },
  {
    title: "Lokacija",
    icon: MapPin,
    fields: ["nbsAdresa", "nbsMesto", "nbsOpstina", "postanskiBroj", "nazivOpstine", "adresa"],
  },
  {
    title: "Bankovni računi",
    icon: Banknote,
    fields: ["racuni"],
  },
  {
    title: "Kontakt",
    icon: Phone,
    fields: ["telefon", "emailAdresa", "webSajt"],
  },
];

const ngoSections = [
  {
    title: "Osnovni podaci",
    icon: Users,
    fields: ["maticniBroj", "naziv", "pib", "tipLica", "sifraDelatnosti", "datumOsnivanja"],
  },
  {
    title: "Oblasti ciljeva",
    icon: Activity,
    fields: ["oblastiCiljeva"],
  },
  {
    title: "Lokacija",
    icon: MapPin,
    fields: ["nbsAdresa", "nbsMesto", "nbsOpstina", "postanskiBroj", "adresa"],
  },
  {
    title: "Bankovni računi",
    icon: Banknote,
    fields: ["racuni"],
  },
  {
    title: "Kontakt",
    icon: Phone,
    fields: ["telefon", "emailAdresa", "webSajt"],
  },
];

const szSections = [
  {
    title: "Osnovni podaci",
    icon: Home,
    fields: ["maticniBroj", "poslovnoIme", "pib", "datumRegistracije"],
  },
  {
    title: "Lokacija",
    icon: MapPin,
    fields: ["adresa", "mesto", "opstina", "nbsAdresa", "nbsMesto", "nbsOpstina", "postanskiBroj"],
  },
  {
    title: "Bankovni računi",
    icon: Banknote,
    fields: ["racuni"],
  },
  {
    title: "Kontakt",
    icon: Phone,
    fields: ["telefon", "emailAdresa", "webSajt"],
  },
];

function getSections(registry: Registry) {
  if (registry === "ngos") return ngoSections;
  if (registry === "sz") return szSections;
  return companySections;
}

// Ćirilica → Latinica transliteracija na frontendu (backup ako backend ne prevede)
const cyrToLat: Record<string, string> = {
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Ђ: "Đ", Е: "E", Ж: "Ž",
  З: "Z", И: "I", Ј: "J", К: "K", Л: "L", Љ: "Lj", М: "M", Н: "N",
  Њ: "Nj", О: "O", П: "P", Р: "R", С: "S", Т: "T", Ћ: "Ć", У: "U",
  Ф: "F", Х: "H", Ц: "C", Ч: "Č", Џ: "Dž", Ш: "Š",
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "đ", е: "e", ж: "ž",
  з: "z", и: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n",
  њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "ć", у: "u",
  ф: "f", х: "h", ц: "c", ч: "č", џ: "dž", ш: "š",
};

function toLat(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += cyrToLat[text[i]] ?? text[i];
  }
  return result;
}

// Polja koja su timestamp-ovi
const timestampFields = new Set([
  "nbsFetchedAt", "lastUpdatedAt", "createdAt", "kontaktAzuriranAt",
]);

function formatFieldValue(key: string, value: any): string | null {
  if (value == null || value === "") return null;
  if (key === "racuni") {
    if (Array.isArray(value) && value.length > 0) return value.join("\n");
    return null;
  }
  if (timestampFields.has(key)) {
    try {
      return new Date(value).toLocaleDateString("sr-Latn-RS", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return String(value);
    }
  }
  // Transliteriši ćirilicu u latinicu
  const str = String(value);
  return /[\u0400-\u04FF]/.test(str) ? toLat(str) : str;
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [registry, setRegistry] = useState<Registry>("companies");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    setSelected(null);
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const endpoint =
          registry === "companies"
            ? "/api/admin/search/companies"
            : registry === "ngos"
              ? "/api/admin/search/ngos"
              : "/api/admin/search/sz";
        const data = await api(`${endpoint}?q=${encodeURIComponent(query)}&limit=30`);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, registry]);

  const enrichNbs = async () => {
    if (!selected) return;
    const mb = selected.maticniBroj;
    console.log("[NBS] Šaljem zahtev:", { maticniBroj: mb, registry });
    setEnriching(true);
    try {
      const res = await api<{ enriched: boolean; data?: any; message?: string }>(
        "/api/admin/enrich-nbs",
        {
          method: "POST",
          body: JSON.stringify({ maticniBroj: mb, registry }),
        }
      );
      console.log("[NBS] Odgovor:", res);
      if (res.enriched && res.data) {
        setSelected(res.data);
        setResults((prev) =>
          prev.map((r) => (r.id === res.data.id ? res.data : r))
        );
        toast.success("NBS podaci uspešno preuzeti");
      } else {
        toast.info(res.message || "NBS nema podatke");
      }
    } catch (err: any) {
      console.error("[NBS] Greška:", err);
      toast.error(err.message || "Greška pri NBS obogaćivanju");
    } finally {
      setEnriching(false);
    }
  };

  const registries: { key: Registry; label: string; icon: any; count?: string }[] = [
    { key: "companies", label: "Pravna lica", icon: Building2 },
    { key: "ngos", label: "Udruženja", icon: Users },
    { key: "sz", label: "Stambene zajednice", icon: Home },
  ];

  const getName = (item: any) => {
    const raw = registry === "ngos" ? item.naziv : item.poslovnoIme;
    return raw && /[\u0400-\u04FF]/.test(raw) ? toLat(raw) : raw;
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "";
    // Transliteriši pa proveri
    const s = (/[\u0400-\u04FF]/.test(status) ? toLat(status) : status).toLowerCase();
    if (s.includes("aktiv")) return "text-green-700 bg-green-50 border-green-200";
    if (s.includes("bris") || s.includes("likv") || s.includes("stečaj") || s.includes("stecaj")) return "text-red-700 bg-red-50 border-red-200";
    return "text-yellow-700 bg-yellow-50 border-yellow-200";
  };

  const sections = getSections(registry);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Pretraga registara</h2>

      {/* Registry tabs */}
      <div className="flex gap-2">
        {registries.map((r) => (
          <button
            key={r.key}
            onClick={() => {
              setRegistry(r.key);
              setResults([]);
              setSelected(null);
              setQuery("");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              registry === r.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            <r.icon className="h-4 w-4" />
            {r.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pretraži po nazivu, matičnom broju ili PIB-u..."
          className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setSelected(null); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Pretraga...
        </div>
      )}

      {/* Results + Detail */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Results list */}
        <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {results.length > 0 && (
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {results.length} rezultat{results.length === 1 ? "" : "a"}
            </p>
          )}
          {results.map((item) => {
            const name = getName(item);
            const mb = item.maticniBroj;
            const isSelected = selected?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className={`group flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-transparent bg-card hover:border-border hover:bg-accent/50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{name}</p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>MB: {mb}</span>
                    {item.pib && <span>PIB: {item.pib}</span>}
                  </div>
                  {item.nazivStatusa && (
                    <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusColor(item.nazivStatusa)}`}>
                      {/[\u0400-\u04FF]/.test(item.nazivStatusa) ? toLat(item.nazivStatusa) : item.nazivStatusa}
                    </span>
                  )}
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform ${isSelected ? "translate-x-0.5" : ""}`} />
              </button>
            );
          })}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">Nema rezultata za "{query}"</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {/* Header card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-foreground truncate">
                    {getName(selected)}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      MB: {selected.maticniBroj}
                    </span>
                    {selected.pib && (
                      <span className="flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5" />
                        PIB: {selected.pib}
                      </span>
                    )}
                    {(selected.datumOsnivanja || selected.datumRegistracije) && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {selected.datumOsnivanja || selected.datumRegistracije}
                      </span>
                    )}
                  </div>
                  {selected.nazivStatusa && (
                    <span className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(selected.nazivStatusa)}`}>
                      {/[\u0400-\u04FF]/.test(selected.nazivStatusa) ? toLat(selected.nazivStatusa) : selected.nazivStatusa}
                    </span>
                  )}
                </div>

                {/* NBS Enrich button */}
                <button
                  onClick={enrichNbs}
                  disabled={enriching}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
                  title={selected.nbsFetchedAt ? "Ponovo preuzmi NBS podatke" : "Preuzmi PIB, račune, adresu iz NBS-a"}
                >
                  {enriching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {selected.nbsFetchedAt ? "Osveži NBS" : "Preuzmi NBS"}
                </button>
              </div>
            </div>

            {/* Sections */}
            {sections.map((section) => {
              const SectionIcon = section.icon;
              const visibleFields = section.fields.filter((f) => {
                const val = selected[f];
                if (val == null || val === "") return false;
                if (f === "racuni" && Array.isArray(val) && val.length === 0) return false;
                return true;
              });
              if (visibleFields.length === 0) return null;

              return (
                <div key={section.title} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <SectionIcon className="h-4 w-4 text-muted-foreground" />
                    {section.title}
                  </div>
                  <div className="space-y-2">
                    {visibleFields.map((field) => {
                      const value = formatFieldValue(field, selected[field]);
                      if (!value) return null;

                      // Računi — poseban prikaz
                      if (field === "racuni") {
                        const accounts = Array.isArray(selected[field]) ? selected[field] : [];
                        return (
                          <div key={field} className="space-y-1">
                            {accounts.map((acc: string, i: number) => (
                              <div key={i} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm font-mono">
                                <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                                {acc}
                              </div>
                            ))}
                          </div>
                        );
                      }

                      // Oblasti ciljeva — dugačak tekst
                      if (field === "oblastiCiljeva") {
                        return (
                          <div key={field} className="text-sm text-foreground leading-relaxed">
                            {value.split(" | ").map((oblast, i) => (
                              <div key={i} className="rounded-md bg-muted/50 px-3 py-1.5 mb-1">
                                {oblast}
                              </div>
                            ))}
                          </div>
                        );
                      }

                      // Kontakt polja sa ikonama
                      const contactIcons: Record<string, any> = {
                        telefon: Phone,
                        emailAdresa: Mail,
                        webSajt: Globe,
                      };
                      const ContactIcon = contactIcons[field];

                      return (
                        <div key={field} className="flex items-start justify-between gap-4 text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                            {ContactIcon && <ContactIcon className="h-3.5 w-3.5" />}
                            {fieldLabels[field] || field}
                          </span>
                          <span className="text-right font-medium text-foreground break-all">
                            {field === "webSajt" ? (
                              <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {value}
                              </a>
                            ) : field === "emailAdresa" ? (
                              <a href={`mailto:${value}`} className="text-primary hover:underline">
                                {value}
                              </a>
                            ) : (
                              value
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* NBS status indicator */}
            {!selected.nbsFetchedAt && (
              <div className="rounded-xl border border-dashed border-yellow-300 bg-yellow-50 p-4 text-center">
                <p className="text-sm text-yellow-800">
                  NBS podaci nisu preuzeti — klikni "Preuzmi NBS" za PIB, račune i adresu
                </p>
              </div>
            )}
          </div>
        ) : query.length >= 2 && results.length > 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border p-12">
            <p className="text-sm text-muted-foreground">Izaberi rezultat za detalje</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
