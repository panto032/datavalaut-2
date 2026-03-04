import https from "https";
import { db } from "../db/connection.js";
import { ngos, syncJobs } from "../db/schema.js";
import { eq } from "drizzle-orm";

const APR_NGO_API = "https://openapi.apr.gov.rs/api/opendata/ngo";
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
    req.on("timeout", () => { req.destroy(); reject(new Error("APR NGO API timeout (180s)")); });
  });
}

export async function startNgoSync() {
  const [job] = await db
    .insert(syncJobs)
    .values({ type: "ngo", status: "fetching" })
    .returning();

  try {
    console.log("NGO sync: preuzimanje podataka...");
    const response = await fetchIgnoringSSL(APR_NGO_API);

    // APR response: { DatumPreseka: "...", Podaci: { [mb]: {...} } }
    const podaci = response.Podaci || response.podaci || {};
    const entries = Object.entries(podaci) as [string, any][];

    console.log(`NGO sync: primljeno ${entries.length} zapisa (datum preseka: ${response.DatumPreseka})`);

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

        // Concatenate oblasti ciljeva
        let oblastiCiljeva: string | null = null;
        if (Array.isArray(record.OblastiOstvarivanjaCiljeva)) {
          oblastiCiljeva = record.OblastiOstvarivanjaCiljeva
            .map((o: any) => [o.NazivOblastiOstvarivanjaCiljeva, o.OpisOblastiOstvarivanjaCiljeva].filter(Boolean).join(": "))
            .join(" | ");
        }

        const entry = {
          naziv: record.Naziv || null,
          sifraMesta: record.SifraMesta ? String(record.SifraMesta) : null,
          sifraDelatnosti: record.SifraDelatnosti ? String(record.SifraDelatnosti) : null,
          datumOsnivanja: record.DatumOsnivanja || null,
          tipLica: record.TipLica || null,
          oblastiCiljeva,
        };

        const [existing] = await db
          .select()
          .from(ngos)
          .where(eq(ngos.maticniBroj, maticniBroj))
          .limit(1);

        if (!existing) {
          await db.insert(ngos).values({
            maticniBroj,
            ...entry,
            dataSource: "apr-ngo",
          });
          newCount++;
        } else {
          const changed = Object.entries(entry).some(
            ([key, val]) => val != null && String((existing as any)[key] || "") !== String(val)
          );
          if (changed) {
            await db
              .update(ngos)
              .set({ ...entry, dataSource: "apr-ngo", lastUpdatedAt: new Date() })
              .where(eq(ngos.id, existing.id));
            updatedCount++;
          } else {
            unchangedCount++;
          }
        }
      }

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
        console.log(`NGO sync progress: ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}`);
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

    console.log(`NGO sync završen: ${newCount} novih, ${updatedCount} ažuriranih`);
    return job.id;
  } catch (err: any) {
    console.error("NGO sync greška:", err);
    await db
      .update(syncJobs)
      .set({ status: "failed", errorMessage: err.message, completedAt: new Date() })
      .where(eq(syncJobs.id, job.id));
    throw err;
  }
}
