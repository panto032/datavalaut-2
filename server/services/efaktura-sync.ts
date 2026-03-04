import https from "https";
import { db } from "../db/connection.js";
import { companies, syncJobs } from "../db/schema.js";
import { eq } from "drizzle-orm";

const EFAKTURA_API = "https://efaktura.mfin.gov.rs/api/publicApi/getAllCompanies?includeAllStatuses=true";
const BATCH_SIZE = 200;

function fetchEfaktura(apiKey: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const url = new URL(EFAKTURA_API);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "GET",
      timeout: 120000,
      headers: {
        ApiKey: apiKey,
        Accept: "application/json",
        "User-Agent": "DataVault/2.0",
      },
    };

    const req = https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (!Array.isArray(parsed)) {
            reject(new Error(`eFaktura API: očekivan niz, dobijeno ${typeof parsed}`));
            return;
          }
          resolve(parsed);
        } catch {
          reject(new Error("Nevažeći JSON odgovor od eFaktura API-ja"));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("eFaktura API timeout (120s)")); });
  });
}

export async function startEfakturaSync() {
  const apiKey = process.env.EFAKTURA_API_KEY;
  if (!apiKey) {
    throw new Error("EFAKTURA_API_KEY environment varijabla nije podešena");
  }

  const [job] = await db
    .insert(syncJobs)
    .values({ type: "efaktura", status: "fetching" })
    .returning();

  try {
    console.log("eFaktura sync: preuzimanje podataka...");
    const records = await fetchEfaktura(apiKey);

    console.log(`eFaktura sync: primljeno ${records.length} zapisa`);

    await db
      .update(syncJobs)
      .set({ status: "processing", totalRecords: records.length })
      .where(eq(syncJobs.id, job.id));

    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let unchangedCount = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      for (const record of batch) {
        const mb = String(record.RegistrationCode || "").trim();
        const pib = String(record.VatRegistrationCode || "").trim();

        // Samo 8-cifreni matični brojevi (ne JMBG-ovi)
        if (!/^\d{8}$/.test(mb)) {
          skippedCount++;
          continue;
        }

        const [existing] = await db
          .select()
          .from(companies)
          .where(eq(companies.maticniBroj, mb))
          .limit(1);

        if (existing) {
          // Ažuriraj PIB ako je različit ili nedostaje
          if (pib && existing.pib !== pib) {
            const newSource = existing.dataSource && existing.dataSource !== "efaktura"
              ? `${existing.dataSource}+efaktura`
              : "efaktura";
            await db
              .update(companies)
              .set({ pib, dataSource: newSource, lastUpdatedAt: new Date() })
              .where(eq(companies.id, existing.id));
            updatedCount++;
          } else {
            unchangedCount++;
          }
        } else {
          // Nova kompanija iz eFakture
          const naziv = record.Name || null;
          const datumOsnivanja = record.RegistrationDate || null;
          const status = record.DeletionDate ? "Брисан" : "Активан";

          await db.insert(companies).values({
            maticniBroj: mb,
            poslovnoIme: naziv,
            pib: pib || null,
            datumOsnivanja,
            nazivStatusa: status,
            dataSource: "efaktura",
          });
          newCount++;
        }
      }

      if (i % (BATCH_SIZE * 50) === 0 || i + BATCH_SIZE >= records.length) {
        await db
          .update(syncJobs)
          .set({
            processedRecords: Math.min(i + BATCH_SIZE, records.length),
            newRecords: newCount,
            updatedRecords: updatedCount,
            unchangedRecords: unchangedCount,
            skippedRecords: skippedCount,
          })
          .where(eq(syncJobs.id, job.id));
        console.log(`eFaktura sync progress: ${Math.min(i + BATCH_SIZE, records.length)}/${records.length}`);
      }
    }

    await db
      .update(syncJobs)
      .set({
        status: "completed",
        processedRecords: records.length,
        newRecords: newCount,
        updatedRecords: updatedCount,
        unchangedRecords: unchangedCount,
        skippedRecords: skippedCount,
        completedAt: new Date(),
      })
      .where(eq(syncJobs.id, job.id));

    console.log(`eFaktura sync završen: ${newCount} novih, ${updatedCount} ažuriranih PIB-ova`);
    return job.id;
  } catch (err: any) {
    console.error("eFaktura sync greška:", err);
    await db
      .update(syncJobs)
      .set({ status: "failed", errorMessage: err.message, completedAt: new Date() })
      .where(eq(syncJobs.id, job.id));
    throw err;
  }
}
