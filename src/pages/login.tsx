import { useState } from "react";
import { toast } from "sonner";
import { Database, Lock, User, ArrowRight, Server, Shield, Zap } from "lucide-react";

export function LoginPage({
  onLogin,
}: {
  onLogin: (username: string, password: string) => Promise<any>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Unesite korisničko ime i lozinku");
      return;
    }
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      toast.error(err.message || "Greška pri prijavi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side — branding + info */}
      <div className="hidden flex-1 flex-col justify-between bg-foreground p-12 text-background lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Database className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">DataValaut</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            API platforma za srpske poslovne registre
          </p>
        </div>

        <div className="space-y-8">
          <div className="space-y-6">
            <Feature
              icon={Server}
              title="Agregacija podataka"
              description="APR, NBS, eFaktura i drugi izvori na jednom mestu"
            />
            <Feature
              icon={Zap}
              title="REST API"
              description="Strukturisan API sa autentifikacijom i dokumentacijom"
            />
            <Feature
              icon={Shield}
              title="NBS Enrichment"
              description="Automatsko obogaćivanje podataka iz Narodne banke Srbije"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          DataValaut v2 — Self-hosted na Coolify
        </p>
      </div>

      {/* Right side — login form */}
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="text-center lg:hidden">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Database className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="mt-3 text-2xl font-bold text-foreground">DataValaut</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              API platforma za poslovne registre
            </p>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-foreground">Prijava</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Unesite kredencijale za pristup admin panelu
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Korisničko ime
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring"
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Lozinka
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                "Prijavljivanje..."
              ) : (
                <>
                  Prijavi se
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/10">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
