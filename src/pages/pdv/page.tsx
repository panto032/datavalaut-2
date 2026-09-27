import { useState } from "react";
import { api } from "../../lib/api";
import { CheckCircle2, XCircle, Search } from "lucide-react";

export function PdvPage() {
  const [pib, setPib] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{9}$/.test(pib)) {
      setError("PIB mora biti tačno 9 cifara");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api(`/api/admin/pdv?pib=${pib}`);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Provera PDV obveznika</h2>
      <p className="text-sm text-muted-foreground">
        Neoficijelna provera preko javnog registra Poreske uprave (purs.gov.rs).
      </p>

      <form onSubmit={handleCheck} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={pib}
            onChange={(e) => setPib(e.target.value)}
            placeholder="PIB (9 cifara)"
            className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            maxLength={9}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Provera..." : "Proveri"}
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && !result.pronadjen && (
        <div className="rounded-xl border border-border bg-muted p-6">
          <p className="text-sm text-muted-foreground">
            Nije pronađen poreski obveznik za PIB {result.pib}.
          </p>
        </div>
      )}

      {result?.pronadjen && (
        <div
          className={`rounded-xl border p-6 ${
            result.pdvObveznik ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-center gap-3">
            {result.pdvObveznik ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-amber-500" />
            )}
            <div>
              <p className="text-lg font-bold">
                {result.pdvObveznik ? "U SISTEMU PDV" : "Nije u sistemu PDV"}
              </p>
              <p className="text-sm text-muted-foreground">{result.naziv}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Matični broj</p>
              <p className="font-medium">{result.maticniBroj}</p>
            </div>
            <div>
              <p className="text-muted-foreground">PIB</p>
              <p className="font-medium">{result.pib}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Adresa</p>
              <p className="font-medium">{result.adresa}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mesto</p>
              <p className="font-medium">{result.mesto}</p>
            </div>
            {result.pdvObveznik && (
              <>
                <div>
                  <p className="text-muted-foreground">Period prijave</p>
                  <p className="font-medium">{result.periodPrijava}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Datum ulaska u PDV</p>
                  <p className="font-medium">{result.datumUlaskaPdv}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
