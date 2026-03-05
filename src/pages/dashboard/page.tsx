import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import { formatNumber, formatDate } from "../../lib/utils";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Home,
  FileBarChart,
  Phone,
  CreditCard,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Upload,
} from "lucide-react";

interface Stats {
  companies: number;
  companiesWithPib: number;
  companiesWithKontakt: number;
  ngos: number;
  stambeneZajednice: number;
  financialStatements: number;
}

interface SyncJob {
  id: number;
  type: string;
  status: string;
  totalRecords: number | null;
  processedRecords: number | null;
  newRecords: number | null;
  updatedRecords: number | null;
  unchangedRecords: number | null;
  skippedRecords: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

const syncTypeLabels: Record<string, string> = {
  apr: "APR kompanija",
  ngo: "Udruženja",
  efaktura: "eFaktura PIB",
  financial: "Finansijski izveštaji",
  "sz-import": "Stambene zajednice",
  delatnosti: "Šifarnik delatnosti",
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  fetching: { label: "Preuzimanje", color: "text-blue-600 bg-blue-50", icon: Loader2 },
  processing: { label: "Obrada", color: "text-yellow-600 bg-yellow-50", icon: Loader2 },
  completed: { label: "Završeno", color: "text-green-600 bg-green-50", icon: CheckCircle2 },
  failed: { label: "Greška", color: "text-red-600 bg-red-50", icon: XCircle },
};

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  const [backendOk, setBackendOk] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [s, jobs] = await Promise.all([
        api<Stats>("/api/admin/stats"),
        api<SyncJob[]>("/api/admin/sync-jobs?limit=20"),
      ]);
      setStats(s);
      setSyncJobs(jobs);
      setBackendOk(true);
    } catch (err) {
      console.error(err);
      setBackendOk(false);
      // Show empty stats in dev mode
      setStats({ companies: 0, companiesWithPib: 0, companiesWithKontakt: 0, ngos: 0, stambeneZajednice: 0, financialStatements: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-polling dok ima aktivnih jobova
  useEffect(() => {
    const hasActiveJobs = syncJobs.some(
      (j) => j.status === "fetching" || j.status === "processing"
    );
    if (!hasActiveJobs) return;

    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [syncJobs, loadData]);

  const startSync = async (type: string) => {
    setSyncing((prev) => ({ ...prev, [type]: true }));
    try {
      await api(`/api/admin/sync/${type}`, { method: "POST" });
      toast.success(`${syncTypeLabels[type] || type} sync pokrenut`);
      // Reload after short delay to show job
      setTimeout(loadData, 1000);
    } catch (err: any) {
      toast.error(err.message || "Greška pri pokretanju sync-a");
    } finally {
      setSyncing((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleFileSync = async (type: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setSyncing((prev) => ({ ...prev, [type]: true }));
      try {
        const text = await file.text();
        const records = JSON.parse(text);
        const data = Array.isArray(records) ? records : records.data || records.records || [];
        await api(`/api/admin/sync/${type}`, {
          method: "POST",
          body: JSON.stringify({ records: data }),
        });
        toast.success(`${syncTypeLabels[type] || type} import pokrenut (${data.length} zapisa)`);
        setTimeout(loadData, 1000);
      } catch (err: any) {
        toast.error(err.message || "Greška pri importu");
      } finally {
        setSyncing((prev) => ({ ...prev, [type]: false }));
      }
    };
    input.click();
  };

  if (loading) {
    return <div className="text-muted-foreground">Učitavanje...</div>;
  }

  const statCards = stats
    ? [
        { label: "Pravna lica", value: stats.companies, icon: Building2 },
        { label: "Sa PIB-om", value: stats.companiesWithPib, icon: CreditCard },
        { label: "Sa kontaktom", value: stats.companiesWithKontakt, icon: Phone },
        { label: "Udruženja", value: stats.ngos, icon: Users },
        { label: "Stambene zajednice", value: stats.stambeneZajednice, icon: Home },
        { label: "Fin. izveštaji", value: stats.financialStatements, icon: FileBarChart },
      ]
    : [];

  const syncActions = [
    { type: "apr", label: "APR kompanija", description: "Preuzmi ~294K pravnih lica iz APR Open API", mode: "auto" as const },
    { type: "financial", label: "Finansijski izveštaji", description: "Preuzmi finansijske izveštaje iz APR Open API", mode: "auto" as const },
    { type: "ngo", label: "Udruženja (NGO)", description: "Preuzmi udruženja/fondacije iz APR Open API", mode: "auto" as const },
    { type: "efaktura", label: "eFaktura PIB", description: "Obogati PIB-ove iz eFaktura API-ja (treba API ključ)", mode: "auto" as const },
    { type: "sz-import", label: "Stambene zajednice", description: "Uvezi SZ podatke iz JSON fajla", mode: "file" as const },
    { type: "delatnosti", label: "Šifarnik delatnosti", description: "Popuni opis delatnosti iz zvaničnog šifarnika (615 šifri)", mode: "auto" as const },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Početna</h2>
        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" />
          Osveži
        </button>
      </div>

      {/* Backend status warning */}
      {!backendOk && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-800">
            Backend server nije dostupan — prikazuju se prazni podaci.
          </p>
          <p className="mt-1 text-xs text-yellow-600">
            Pokreni Express server sa PostgreSQL bazom da vidiš prave podatke.
            Potrebno: DATABASE_URL environment varijabla.
          </p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {formatNumber(card.value)}
                </p>
              </div>
              <card.icon className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </div>
        ))}
      </div>

      {/* Sync controls */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">Sinhronizacija podataka</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {syncActions.map((action) => (
            <div
              key={action.type}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-foreground">{action.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
              </div>
              <button
                onClick={() =>
                  action.mode === "auto"
                    ? startSync(action.type)
                    : handleFileSync(action.type)
                }
                disabled={syncing[action.type]}
                className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {syncing[action.type] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : action.mode === "auto" ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {syncing[action.type]
                  ? "U toku..."
                  : action.mode === "auto"
                    ? "Pokreni sync"
                    : "Uvezi fajl"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sync history */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">Istorija sinhronizacija</h3>
        {syncJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nema sinhronizacija</p>
        ) : (
          <div className="space-y-2">
            {syncJobs.map((job) => {
              const config = statusConfig[job.status] || statusConfig.processing;
              const StatusIcon = config.icon;
              const progress =
                job.totalRecords && job.totalRecords > 0
                  ? Math.round(((job.processedRecords || 0) / job.totalRecords) * 100)
                  : null;

              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {syncTypeLabels[job.type] || job.type}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
                        >
                          <StatusIcon
                            className={`h-3 w-3 ${
                              job.status === "fetching" || job.status === "processing"
                                ? "animate-spin"
                                : ""
                            }`}
                          />
                          {config.label}
                        </span>
                      </div>

                      {/* Progress bar */}
                      {progress !== null && job.status !== "completed" && (
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}

                      {/* Stats row */}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {job.totalRecords != null && (
                          <span>Ukupno: {formatNumber(job.totalRecords)}</span>
                        )}
                        {job.processedRecords != null && (
                          <span>Obrađeno: {formatNumber(job.processedRecords)}</span>
                        )}
                        {(job.newRecords ?? 0) > 0 && (
                          <span className="text-green-600">Novih: {formatNumber(job.newRecords)}</span>
                        )}
                        {(job.updatedRecords ?? 0) > 0 && (
                          <span className="text-blue-600">Ažuriranih: {formatNumber(job.updatedRecords)}</span>
                        )}
                        {(job.skippedRecords ?? 0) > 0 && (
                          <span>Preskočenih: {formatNumber(job.skippedRecords)}</span>
                        )}
                      </div>

                      {job.errorMessage && (
                        <p className="mt-1 text-xs text-destructive">{job.errorMessage}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(job.startedAt)}
                      </span>
                      {job.completedAt && (
                        <span className="mt-0.5">
                          Trajanje:{" "}
                          {Math.round(
                            (new Date(job.completedAt).getTime() -
                              new Date(job.startedAt).getTime()) /
                              1000
                          )}
                          s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
