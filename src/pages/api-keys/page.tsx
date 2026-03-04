import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { formatNumber, formatDate } from "../../lib/utils";
import { toast } from "sonner";
import { Key, Plus, Trash2, Ban, Check, Copy } from "lucide-react";

interface ApiKey {
  id: number;
  name: string;
  key: string;
  isActive: boolean;
  requestCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadKeys = async () => {
    try {
      const data = await api<ApiKey[]>("/api/admin/api-keys");
      setKeys(data);
    } catch {
      toast.error("Greška pri učitavanju ključeva");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      await api("/api/admin/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: newKeyName }),
      });
      setNewKeyName("");
      loadKeys();
      toast.success("API ključ kreiran");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id: number) => {
    if (!confirm("Da li ste sigurni?")) return;
    await api(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    loadKeys();
    toast.success("Ključ obrisan");
  };

  const toggleKey = async (id: number, isActive: boolean) => {
    const action = isActive ? "revoke" : "activate";
    await api(`/api/admin/api-keys/${id}/${action}`, { method: "PATCH" });
    loadKeys();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Ključ kopiran");
  };

  if (loading) return <div className="text-muted-foreground">Učitavanje...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">API ključevi</h2>

      <div className="flex gap-3">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Ime novog ključa"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => e.key === "Enter" && createKey()}
        />
        <button
          onClick={createKey}
          disabled={creating || !newKeyName.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Kreiraj
        </button>
      </div>

      <div className="space-y-3">
        {keys.map((k) => (
          <div
            key={k.id}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
          >
            <Key
              className={`h-5 w-5 ${k.isActive ? "text-green-500" : "text-muted-foreground"}`}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{k.name}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {k.key}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Zahteva: {formatNumber(k.requestCount)} •
                Poslednja upotreba: {formatDate(k.lastUsedAt)} •
                Kreirano: {formatDate(k.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyKey(k.key)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                title="Kopiraj"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => toggleKey(k.id, k.isActive)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                title={k.isActive ? "Deaktiviraj" : "Aktiviraj"}
              >
                {k.isActive ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </button>
              <button
                onClick={() => deleteKey(k.id)}
                className="rounded-lg p-2 text-destructive hover:bg-red-50"
                title="Obriši"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {keys.length === 0 && (
          <p className="text-sm text-muted-foreground">Nema API ključeva</p>
        )}
      </div>
    </div>
  );
}
