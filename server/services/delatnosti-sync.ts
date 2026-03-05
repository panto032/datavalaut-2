import { db } from "../db/connection.js";
import { companies, syncJobs } from "../db/schema.js";
import { isNotNull, isNull, eq } from "drizzle-orm";
import { getDelatnostOpis } from "../utils/delatnosti.js";

const BATCH_SIZE = 500;

export async function startDelatnostiSync() {
  const [job] = await db
    .insert(syncJobs)
    .values({ type: "delatnosti", status: "processing" })
    .returning();

  try {
    const rows = await db
      .select({ id: companies.id, sifra: companies.sifraDelatnosti })
      .from(companies)
      .where(isNotNull(companies.sifraDelatnosti));

    const toUpdate = rows.filter((r) => r.sifra && getDelatnostOpis(r.sifra));

    await db
      .update(syncJobs)
      .set({ totalRecords: toUpdate.length })
      .where(eq(syncJobs.id, job.id));

    console.log(`Delatnosti sync: ${toUpdate.length} kompanija za ažuriranje od ${rows.length} sa šifrom`);

    let updatedCount = 0;

    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);

      for (const row of batch) {
        const opis = getDelatnostOpis(row.sifra!);
        if (opis) {
          await db
            .update(companies)
            .set({ delatnostOpis: opis })
            .where(eq(companies.id, row.id));
          updatedCount++;
        }
      }

      await db
        .update(syncJobs)
        .set({ processedRecords: Math.min(i + BATCH_SIZE, toUpdate.length), updatedRecords: updatedCount })
        .where(eq(syncJobs.id, job.id));

      if (i % 5000 === 0) {
        console.log(`Delatnosti sync: ${Math.min(i + BATCH_SIZE, toUpdate.length)}/${toUpdate.length}`);
      }
    }

    await db
      .update(syncJobs)
      .set({
        status: "completed",
        processedRecords: toUpdate.length,
        updatedRecords: updatedCount,
        unchangedRecords: rows.length - toUpdate.length,
        completedAt: new Date(),
      })
      .where(eq(syncJobs.id, job.id));

    console.log(`Delatnosti sync završen: ${updatedCount} ažurirano`);
    return job.id;
  } catch (err: any) {
    console.error("Delatnosti sync greška:", err);
    await db
      .update(syncJobs)
      .set({ status: "failed", errorMessage: err.message, completedAt: new Date() })
      .where(eq(syncJobs.id, job.id));
    throw err;
  }
}
