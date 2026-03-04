import {
  pgTable,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  numeric,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  username: varchar({ length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companies = pgTable(
  "companies",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    maticniBroj: varchar("maticni_broj", { length: 8 }).notNull().unique(),
    poslovnoIme: text("poslovno_ime"),
    sifraOpstine: varchar("sifra_opstine", { length: 10 }),
    nazivOpstine: text("naziv_opstine"),
    nazivStatusa: text("naziv_statusa"),
    datumOsnivanja: text("datum_osnivanja"),
    nazivPravneForme: text("naziv_pravne_forme"),
    sifraDelatnosti: varchar("sifra_delatnosti", { length: 10 }),
    delatnostOpis: text("delatnost_opis"),
    // NBS enrichment
    pib: varchar({ length: 15 }),
    racuni: jsonb().$type<string[]>().default([]),
    nbsAdresa: text("nbs_adresa"),
    nbsMesto: text("nbs_mesto"),
    nbsOpstina: text("nbs_opstina"),
    postanskiBroj: varchar("postanski_broj", { length: 10 }),
    nbsFetchedAt: timestamp("nbs_fetched_at"),
    // Contact
    telefon: text(),
    webSajt: text("web_sajt"),
    emailAdresa: text("email_adresa"),
    adresa: text(),
    // Tracking
    dataSource: text("data_source"),
    lastUpdatedByApiKey: integer("last_updated_by_api_key"),
    lastUpdatedAt: timestamp("last_updated_at"),
    kontaktAzuriranAt: timestamp("kontakt_azuriran_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("companies_mb_idx").on(table.maticniBroj),
    index("companies_pib_idx").on(table.pib),
    index("companies_opstina_idx").on(table.nazivOpstine),
    index("companies_status_idx").on(table.nazivStatusa),
    index("companies_delatnost_idx").on(table.sifraDelatnosti),
  ]
);

export const ngos = pgTable(
  "ngos",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    maticniBroj: varchar("maticni_broj", { length: 8 }).notNull().unique(),
    naziv: text(),
    sifraMesta: varchar("sifra_mesta", { length: 10 }),
    sifraDelatnosti: varchar("sifra_delatnosti", { length: 10 }),
    datumOsnivanja: text("datum_osnivanja"),
    tipLica: text("tip_lica"),
    oblastiCiljeva: text("oblasti_ciljeva"),
    // NBS enrichment
    pib: varchar({ length: 15 }),
    racuni: jsonb().$type<string[]>().default([]),
    nbsAdresa: text("nbs_adresa"),
    nbsMesto: text("nbs_mesto"),
    nbsOpstina: text("nbs_opstina"),
    postanskiBroj: varchar("postanski_broj", { length: 10 }),
    nbsFetchedAt: timestamp("nbs_fetched_at"),
    // Contact
    telefon: text(),
    webSajt: text("web_sajt"),
    emailAdresa: text("email_adresa"),
    adresa: text(),
    // Tracking
    dataSource: text("data_source"),
    lastUpdatedByApiKey: integer("last_updated_by_api_key"),
    lastUpdatedAt: timestamp("last_updated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ngos_mb_idx").on(table.maticniBroj),
    index("ngos_pib_idx").on(table.pib),
    index("ngos_tip_idx").on(table.tipLica),
  ]
);

export const stambeneZajednice = pgTable(
  "stambene_zajednice",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    maticniBroj: varchar("maticni_broj", { length: 8 }).notNull().unique(),
    pib: varchar({ length: 15 }),
    poslovnoIme: text("poslovno_ime"),
    adresa: text(),
    mesto: text(),
    opstina: text(),
    datumRegistracije: text("datum_registracije"),
    // NBS enrichment
    racuni: jsonb().$type<string[]>().default([]),
    nbsAdresa: text("nbs_adresa"),
    nbsMesto: text("nbs_mesto"),
    nbsOpstina: text("nbs_opstina"),
    postanskiBroj: varchar("postanski_broj", { length: 10 }),
    nbsFetchedAt: timestamp("nbs_fetched_at"),
    // Contact
    telefon: text(),
    webSajt: text("web_sajt"),
    emailAdresa: text("email_adresa"),
    // Tracking
    dataSource: text("data_source"),
    lastUpdatedByApiKey: integer("last_updated_by_api_key"),
    lastUpdatedAt: timestamp("last_updated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sz_mb_idx").on(table.maticniBroj),
    index("sz_pib_idx").on(table.pib),
    index("sz_opstina_idx").on(table.opstina),
    index("sz_mesto_idx").on(table.mesto),
  ]
);

export const financialStatements = pgTable(
  "financial_statements",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    maticniBroj: varchar("maticni_broj", { length: 8 }).notNull(),
    poslovnoIme: text("poslovno_ime"),
    sifraOpstine: varchar("sifra_opstine", { length: 10 }),
    nazivOpstine: text("naziv_opstine"),
    godinaFi: integer("godina_fi").notNull(),
    ukupniPrihodi: numeric("ukupni_prihodi"),
    netoDobitak: numeric("neto_dobitak"),
    netoGubitak: numeric("neto_gubitak"),
    kapital: numeric(),
    poslovnaImovina: numeric("poslovna_imovina"),
    gubitak: numeric(),
    prosecanBrojZaposlenih: integer("prosecan_broj_zaposlenih"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("fi_mb_godina_idx").on(table.maticniBroj, table.godinaFi),
    index("fi_mb_idx").on(table.maticniBroj),
  ]
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    key: varchar({ length: 70 }).notNull().unique(),
    name: varchar({ length: 200 }).notNull(),
    userId: integer("user_id").references(() => users.id),
    isActive: boolean("is_active").default(true).notNull(),
    requestCount: bigint("request_count", { mode: "number" }).default(0).notNull(),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("api_keys_key_idx").on(table.key)]
);

export const syncJobs = pgTable("sync_jobs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  type: varchar({ length: 50 }).notNull(),
  status: varchar({ length: 20 }).notNull().default("fetching"),
  totalRecords: integer("total_records").default(0),
  processedRecords: integer("processed_records").default(0),
  newRecords: integer("new_records").default(0),
  updatedRecords: integer("updated_records").default(0),
  unchangedRecords: integer("unchanged_records").default(0),
  skippedRecords: integer("skipped_records").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
