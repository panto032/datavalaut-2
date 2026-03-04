import { db } from "../db/connection.js";
import { stambeneZajednice, syncJobs } from "../db/schema.js";
import { eq } from "drizzle-orm";

const BATCH_SIZE = 100;

export async function startSzImport(records: any[]) {
  const [job] = await db
    .insert(syncJobs)
    .values({ type: "sz-import", status: "processing", totalRecords: records.length })
    .returning();

  try {
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      for (const record of batch) {
        const mb = String(record.maticniBroj || record.MaticniBroj || "").trim();
        if (!/^\d{8}$/.test(mb)) {
          skippedCount++;
          continue;
        }

        const [existing] = await db
          .select()
          .from(stambeneZajednice)
          .where(eq(stambeneZajednice.maticniBroj, mb))
          .limit(1);

        const entry = {
          pib: record.pib || record.PIB || null,
          poslovnoIme: record.poslovnoIme || record.naziv || null,
          adresa: record.adresa || null,
          mesto: record.mesto || null,
          opstina: record.opstina || null,
          datumRegistracije: record.datumRegistracije || null,
        };

        if (!existing) {
          await db.insert(stambeneZajednice).values({ maticniBroj: mb, ...entry, dataSource: "csv-import" });
          newCount++;
        } else {
          await db
            .update(stambeneZajednice)
            .set({ ...entry, lastUpdatedAt: new Date() })
            .where(eq(stambeneZajednice.id, existing.id));
          updatedCount++;
        }
      }

      await db
        .update(syncJobs)
        .set({
          processedRecords: Math.min(i + BATCH_SIZE, records.length),
          newRecords: newCount,
          updatedRecords: updatedCount,
          skippedRecords: skippedCount,
        })
        .where(eq(syncJobs.id, job.id));
    }

    await db
      .update(syncJobs)
      .set({
        status: "completed",
        processedRecords: records.length,
        newRecords: newCount,
        updatedRecords: updatedCount,
        skippedRecords: skippedCount,
        completedAt: new Date(),
      })
      .where(eq(syncJobs.id, job.id));

    return job.id;
  } catch (err: any) {
    await db
      .update(syncJobs)
      .set({ status: "failed", errorMessage: err.message, completedAt: new Date() })
      .where(eq(syncJobs.id, job.id));
    throw err;
  }
}
