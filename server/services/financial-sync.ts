import https from "https";
import { db } from "../db/connection.js";
import { financialStatements, syncJobs } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

const APR_FI_API = "https://openapi.apr.gov.rs/api/opendata/companies/financial-statements";
const BATCH_SIZE = 200;

function fetchIgnoringSSL(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { rejectUnauthorized: false, timeout: 180000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Nevažeći JSON odgovor od APR-a"));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("APR FI API timeout (180s)")); });
  });
}

export async function startFinancialSync() {
  const [job] = await db
    .insert(syncJobs)
    .values({ type: "financial", status: "fetching" })
    .returning();

  try {
    console.log("Financial sync: preuzimanje podataka...");
    const response = await fetchIgnoringSSL(APR_FI_API);

    // APR response: { DatumPreseka: "...", Podaci: { [mb]: {...} } }
    const podaci = response.Podaci || response.podaci || {};
    const entries = Object.entries(podaci) as [string, any][];

    console.log(`Financial sync: primljeno ${entries.length} zapisa (datum preseka: ${response.DatumPreseka})`);

    await db
      .update(syncJobs)
      .set({ status: "processing", totalRecords: entries.length })
      .where(eq(syncJobs.id, job.id));

    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      for (const [mb, record] of batch) {
        const maticniBroj = String(mb).trim();
        if (!/^\d{8}$/.test(maticniBroj)) {
          skippedCount++;
          continue;
        }

        const godina = parseInt(String(record.GodinaFi || ""));
        if (!godina) {
          skippedCount++;
          continue;
        }

        const entry = {
          poslovnoIme: record.PoslovnoIme != null ? String(record.PoslovnoIme) : null,
          sifraOpstine: record.SifraOpstine != null ? String(record.SifraOpstine) : null,
          nazivOpstine: record.NazivOpstine != null ? String(record.NazivOpstine) : null,
          ukupniPrihodi: record.UkupniPrihodi != null ? String(record.UkupniPrihodi) : null,
          netoDobitak: record.NetoDobitak != null ? String(record.NetoDobitak) : null,
          netoGubitak: record.NetoGubitak != null ? String(record.NetoGubitak) : null,
          kapital: record.Kapital != null ? String(record.Kapital) : null,
          poslovnaImovina: record.PoslovnaImovina != null ? String(record.PoslovnaImovina) : null,
          gubitak: record.Gubitak != null ? String(record.Gubitak) : null,
          prosecanBrojZaposlenih: record.ProsecanBrojZaposlenih != null
            ? parseInt(String(record.ProsecanBrojZaposlenih))
            : null,
        };

        const [existing] = await db
          .select()
          .from(financialStatements)
          .where(
            and(
              eq(financialStatements.maticniBroj, maticniBroj),
              eq(financialStatements.godinaFi, godina)
            )
          )
          .limit(1);

        if (!existing) {
          await db.insert(financialStatements).values({
            maticniBroj,
            godinaFi: godina,
            ...entry,
          });
          newCount++;
        } else {
          await db
            .update(financialStatements)
            .set(entry)
            .where(eq(financialStatements.id, existing.id));
          updatedCount++;
        }
      }

      if (i % (BATCH_SIZE * 10) === 0 || i + BATCH_SIZE >= entries.length) {
        await db
          .update(syncJobs)
          .set({
            processedRecords: Math.min(i + BATCH_SIZE, entries.length),
            newRecords: newCount,
            updatedRecords: updatedCount,
            skippedRecords: skippedCount,
          })
          .where(eq(syncJobs.id, job.id));
        console.log(`Financial sync progress: ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}`);
      }
    }

    await db
      .update(syncJobs)
      .set({
        status: "completed",
        processedRecords: entries.length,
        newRecords: newCount,
        updatedRecords: updatedCount,
        skippedRecords: skippedCount,
        completedAt: new Date(),
      })
      .where(eq(syncJobs.id, job.id));

    console.log(`Financial sync završen: ${newCount} novih, ${updatedCount} ažuriranih`);
    return job.id;
  } catch (err: any) {
    console.error("Financial sync greška:", err);
    await db
      .update(syncJobs)
      .set({ status: "failed", errorMessage: err.message, completedAt: new Date() })
      .where(eq(syncJobs.id, job.id));
    throw err;
  }
}
