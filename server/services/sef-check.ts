const SEF_CHECK_API =
  "https://efaktura.mfin.gov.rs/api/publicApi/Company/CheckIfCompanyRegisteredOnEfaktura";

export interface SefIdentifikator {
  maticniBroj?: string;
  pib?: string;
  jbkjs?: string;
}

interface SefCheckResult {
  registrovanNaSef: boolean | null;
  budzetskiKorisnik: boolean;
  proveraPo: "jbkjs" | "pib" | "maticniBroj";
}

async function pozovi(body: Record<string, string>) {
  const res = await fetch(SEF_CHECK_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json();
  if (res.ok) return { registrovan: Boolean(data.EFakturaRegisteredCompany) };
  if (String(data.ErrorCode || "").includes("IsBudgetUser")) return { budzetskiKorisnik: true };
  throw new Error(data.Message || `eFaktura API greška (${res.status})`);
}

// Budžetski korisnici se na SEF-u vode po JBKJS-u — provera po MB-u za njih vraća false,
// a provera po PIB-u vraća grešku CompanyWithVATRegistrationCodeIsBudgetUser.
export async function proveriSef(ident: SefIdentifikator): Promise<SefCheckResult> {
  if (ident.jbkjs) {
    const r = await pozovi({ jbkjs: ident.jbkjs });
    return { registrovanNaSef: r.registrovan ?? null, budzetskiKorisnik: true, proveraPo: "jbkjs" };
  }

  if (ident.pib) {
    const r = await pozovi({ vatNumber: ident.pib });
    if (r.budzetskiKorisnik) {
      return { registrovanNaSef: null, budzetskiKorisnik: true, proveraPo: "pib" };
    }
    return { registrovanNaSef: r.registrovan ?? null, budzetskiKorisnik: false, proveraPo: "pib" };
  }

  const r = await pozovi({ registrationNumber: ident.maticniBroj! });
  return {
    registrovanNaSef: r.registrovan ?? null,
    budzetskiKorisnik: false,
    proveraPo: "maticniBroj",
  };
}
