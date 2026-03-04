import https from "https";
import { db } from "../db/connection.js";
import { companies, syncJobs } from "../db/schema.js";
import { eq } from "drizzle-orm";

const APR_API = "https://openapi.apr.gov.rs/api/opendata/companies";
const BATCH_SIZE = 200;

function fetchIgnoringSSL(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { rejectUnauthorized: false, timeout: 120000 }, (res) => {
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
    req.on("timeout", () => { req.destroy(); reject(new Error("APR API timeout (120s)")); });
  });
}

export async function startAprSync() {
  const [job] = await db
    .insert(syncJobs)
    .values({ type: "apr", status: "fetching" })
    .returning();

  try {
    console.log("APR sync: preuzimanje podataka...");
    const response = await fetchIgnoringSSL(APR_API);

    // APR response format: { DatumPreseka: "...", Podaci: { [mb]: {...} } }
    const podaci = response.Podaci || response.podaci || {};
    const entries = Object.entries(podaci) as [string, any][];

    console.log(`APR sync: primljeno ${entries.length} zapisa (datum preseka: ${response.DatumPreseka})`);

    await db
      .update(syncJobs)
      .set({ status: "processing", totalRecords: entries.length })
      .where(eq(syncJobs.id, job.id));

    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      for (const [mb, record] of batch) {
        const maticniBroj = String(mb).trim();
        if (!/^\d{8}$/.test(maticniBroj)) {
          skippedCount++;
          continue;
        }

        const entry = {
          poslovnoIme: record.PoslovnoIme || null,
          sifraOpstine: record.SifraOpstine ? String(record.SifraOpstine) : null,
          nazivOpstine: record.NazivOpstine || null,
          nazivStatusa: record.NazivStatus || null,
          datumOsnivanja: record.DatumOsnivanja || null,
          nazivPravneForme: record.NazivPravneForme || null,
          sifraDelatnosti: record.SifraDelatnosti ? String(record.SifraDelatnosti) : null,
        };

        const [existing] = await db
          .select()
          .from(companies)
          .where(eq(companies.maticniBroj, maticniBroj))
          .limit(1);

        if (!existing) {
          await db.insert(companies).values({
            maticniBroj,
            ...entry,
            dataSource: "apr",
          });
          newCount++;
        } else {
          const changed = Object.entries(entry).some(
            ([key, val]) => val != null && String((existing as any)[key] || "") !== String(val)
          );
          if (changed) {
            const newSource = existing.dataSource && existing.dataSource !== "apr"
              ? `apr+${existing.dataSource}`
              : "apr";
            await db
              .update(companies)
              .set({ ...entry, dataSource: newSource, lastUpdatedAt: new Date() })
              .where(eq(companies.id, existing.id));
            updatedCount++;
          } else {
            unchangedCount++;
          }
        }
      }

      // Update progress every 10 batches
      if (i % (BATCH_SIZE * 10) === 0 || i + BATCH_SIZE >= entries.length) {
        await db
          .update(syncJobs)
          .set({
            processedRecords: Math.min(i + BATCH_SIZE, entries.length),
            newRecords: newCount,
            updatedRecords: updatedCount,
            unchangedRecords: unchangedCount,
            skippedRecords: skippedCount,
          })
          .where(eq(syncJobs.id, job.id));
        console.log(`APR sync progress: ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}`);
      }
    }

    await db
      .update(syncJobs)
      .set({
        status: "completed",
        processedRecords: entries.length,
        newRecords: newCount,
        updatedRecords: updatedCount,
        unchangedRecords: unchangedCount,
        skippedRecords: skippedCount,
        completedAt: new Date(),
      })
      .where(eq(syncJobs.id, job.id));

    console.log(`APR sync završen: ${newCount} novih, ${updatedCount} ažuriranih, ${unchangedCount} nepromenjenih`);
    return job.id;
  } catch (err: any) {
    console.error("APR sync greška:", err);
    await db
      .update(syncJobs)
      .set({ status: "failed", errorMessage: err.message, completedAt: new Date() })
      .where(eq(syncJobs.id, job.id));
    throw err;
  }
}
