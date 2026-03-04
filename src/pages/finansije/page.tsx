import { useState } from "react";
import { api } from "../../lib/api";
import { formatNumber } from "../../lib/utils";
import { Search, FileBarChart } from "lucide-react";

export function FinansijePage() {
  const [mb, setMb] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(mb)) {
      setError("Matični broj mora biti tačno 8 cifara");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api(`/api/admin/financial?mb=${mb}`);
      setResults(Array.isArray(data) ? data : [data]);
    } catch (err: any) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Finansijski izveštaji</h2>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={mb}
            onChange={(e) => setMb(e.target.value)}
            placeholder="Matični broj (8 cifara)"
            className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            maxLength={8}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Pretraga..." : "Pretraži"}
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {results[0]?.poslovno_ime || results[0]?.poslovnoIme} — {results.length} izveštaj(a)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left font-medium text-muted-foreground">Godina</th>
                  <th className="p-2 text-right font-medium text-muted-foreground">Prihodi</th>
                  <th className="p-2 text-right font-medium text-muted-foreground">Dobitak</th>
                  <th className="p-2 text-right font-medium text-muted-foreground">Gubitak</th>
                  <th className="p-2 text-right font-medium text-muted-foreground">Kapital</th>
                  <th className="p-2 text-right font-medium text-muted-foreground">Imovina</th>
                  <th className="p-2 text-right font-medium text-muted-foreground">Zaposleni</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-accent/50">
                    <td className="p-2 font-medium">{r.godina_fi || r.godinaFi}</td>
                    <td className="p-2 text-right">{formatNumber(r.ukupni_prihodi || r.ukupniPrihodi)}</td>
                    <td className="p-2 text-right text-green-600">{formatNumber(r.neto_dobitak || r.netoDobitak)}</td>
                    <td className="p-2 text-right text-red-600">{formatNumber(r.neto_gubitak || r.netoGubitak)}</td>
                    <td className="p-2 text-right">{formatNumber(r.kapital)}</td>
                    <td className="p-2 text-right">{formatNumber(r.poslovna_imovina || r.poslovnaImovina)}</td>
                    <td className="p-2 text-right">{formatNumber(r.prosecan_broj_zaposlenih || r.prosecanBrojZaposlenih)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
