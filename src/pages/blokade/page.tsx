import { useState } from "react";
import { api } from "../../lib/api";
import { ShieldAlert, ShieldCheck, Search } from "lucide-react";

export function BlokadePage() {
  const [mb, setMb] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(mb)) {
      setError("Matični broj mora biti tačno 8 cifara");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api(`/api/admin/blokade?mb=${mb}`);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Provera blokade</h2>

      <form onSubmit={handleCheck} className="flex gap-3">
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
          {loading ? "Provera..." : "Proveri"}
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div
          className={`rounded-xl border p-6 ${
            result.uBlokadi
              ? "border-red-200 bg-red-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <div className="flex items-center gap-3">
            {result.uBlokadi ? (
              <ShieldAlert className="h-8 w-8 text-red-500" />
            ) : (
              <ShieldCheck className="h-8 w-8 text-green-500" />
            )}
            <div>
              <p className="text-lg font-bold">
                {result.uBlokadi ? "U BLOKADI" : "Nije u blokadi"}
              </p>
              <p className="text-sm text-muted-foreground">
                Matični broj: {result.maticniBroj}
              </p>
              {result.iznosBlokade && (
                <p className="mt-1 text-sm font-medium text-red-600">
                  Iznos: {result.iznosBlokade}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
