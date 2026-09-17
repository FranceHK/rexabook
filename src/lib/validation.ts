import { z } from "zod";

const jina = z.string().trim().min(1, "Jina linahitajika.");
const simu = z
  .string()
  .trim()
  .max(20, "Namba ya simu ni ndefu mno (max 20).")
  .optional()
  .or(z.literal(""));
const location = z
  .string()
  .trim()
  .max(150, "Makazi ni marefu mno (max 150).")
  .optional()
  .or(z.literal(""));

const nenosiri = z
  .string()
  .min(6, "Nenosiri liwe na herufi 6 au zaidi.");

const kiasi = z
  .coerce
  .number()
  .positive("Kiasi lazima kiwe namba zaidi ya sufuri.");

// ── Auth ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  jina: jina,
  nenosiri: z.string().min(1, "Nenosiri linahitajika."),
});

export const registerSchema = z
  .object({
    jina: z
      .string()
      .trim()
      .min(1, "Jina la mtumiaji linahitajika.")
      .max(100, "Jina la mtumiaji ni refu mno."),
    jinaDuka: z
      .string()
      .trim()
      .min(1, "Jina la duka linahitajika.")
      .max(150, "Jina la duka ni refu mno."),
    nenosiri,
    nenosiri2: z.string(),
  })
  .refine((v) => v.nenosiri === v.nenosiri2, {
    message: "Nenosiri hayafanani. Tafadhali jaribu tena.",
    path: ["nenosiri2"],
  });

// ── Customers ─────────────────────────────────────────────────────────

export const customerCreateSchema = z.object({
  jina,
  simu: simu.optional(),
  location: location.optional(),
});

export const customerUpdateSchema = z.object({
  mteja_id: z.coerce.number().int().positive(),
  jina,
  simu: simu.optional(),
  location: location.optional(),
});

// ── Debts & payments ──────────────────────────────────────────────────

export const debtCreateSchema = z.object({
  mteja_id: z.coerce.number().int().positive("Mteja ID inahitajika."),
  jina_bidhaa: z
    .string()
    .trim()
    .min(1, "Jina la bidhaa/huduma linahitajika.")
    .max(150, "Jina la bidhaa ni refu mno."),
  kiasi: z.coerce
    .number()
    .positive("Kiasi lazima kiwe namba zaidi ya sufuri."),
  tarehe: z.string().min(1, "Tarehe inahitajika."),
  maelezo: z.string().trim().max(2000, "Maelezo ni marefu mno.").optional().or(z.literal("")),
});

export const paymentSchema = z.object({
  deni_id: z.coerce.number().int().positive("Deni ID inahitajika."),
  kiasi: kiasi,
  maelezo: z.string().trim().max(500, "Maelezo ni marefu mno.").optional().or(z.literal("")),
});

// ── Cargo ─────────────────────────────────────────────────────────────

export const cargoItemSchema = z.object({
  jina_bidhaa: z.string().trim().min(1, "Jina la bidhaa linahitajika."),
  idadi: z.coerce.number().int().positive("Idadi lazima iwe namba chanya."),
  kitengo: z.string().trim().min(1).max(50).default("pc"),
  bei_kwa_kipande: z.coerce.number().min(0, "Bei haiwezi kuwa chini ya 0."),
});

export const cargoCreateSchema = z.object({
  jina_kampuni: z
    .string()
    .trim()
    .min(1, "Jina la kampuni/msambazaji linahitajika.")
    .max(150),
  aina_usafiri: z.string().trim().max(100).optional().or(z.literal("")),
  nambari_tracking: z.string().trim().max(100).optional().or(z.literal("")),
  tarehe_kuagiza: z.string().min(1, "Tarehe ya kuagiza inahitajika."),
  tarehe_kutarajiwa: z.string().optional().or(z.literal("")),
  maelezo: z.string().trim().max(2000, "Maelezo ni marefu mno.").optional().or(z.literal("")),
  bidhaa: z.array(cargoItemSchema).min(1, "Ongeza angalau bidhaa moja."),
});

export const cargoHaliSchema = z.object({
  id: z.coerce.number().int().positive(),
  hali: z.enum(["Haijafika", "Imefika"]),
  tarehe_kufika: z.string().optional().or(z.literal("")),
  maelezo_fika: z.string().trim().max(1000, "Maelezo ni marefu mno.").optional().or(z.literal("")),
});

// ── Company payment cards ─────────────────────────────────────────────

export const companyCardSchema = z.object({
  jina_kampuni: z
    .string()
    .trim()
    .min(1, "Jina la kampuni linahitajika.")
    .max(150, "Jina la kampuni ni refu mno."),
  bank: z
    .string()
    .trim()
    .min(1, "Jina la benki linahitajika.")
    .max(150, "Jina la benki ni refu mno."),
  namba_malipo: z
    .string()
    .trim()
    .min(1, "Namba ya malipo inahitajika.")
    .max(100, "Namba ya malipo ni ndefu mno."),
});

// ── PDF report ────────────────────────────────────────────────────────

export const reportParamsSchema = z
  .object({
    mteja_id: z.coerce.number().int().positive(),
    report_type: z.enum(["wiki", "mwezi", "miezi_3", "miezi_6", "mwaka", "custom"]),
    start_date: z.string().optional().or(z.literal("")),
    end_date: z.string().optional().or(z.literal("")),
    include_payments: z.coerce.boolean().default(true),
  })
  .refine(
    (v) => {
      if (v.report_type !== "custom") return true;
      if (!v.start_date || !v.end_date) return false;
      return new Date(v.start_date) <= new Date(v.end_date);
    },
    {
      message: "Tafadhali chagua tarehe za anza na mwisho (anza ≤ mwisho).",
      path: ["start_date"],
    }
  );

// ── Profile / settings ────────────────────────────────────────────────

export const profileSchema = z.object({
  jina: z
    .string()
    .trim()
    .min(1, "Jina la mtumiaji linahitajika.")
    .max(100),
  jina_duka: z
    .string()
    .trim()
    .min(1, "Jina la duka linahitajika.")
    .max(150),
  simu: simu.optional(),
});

export const passwordSchema = z.object({
  la_zamani: z.string().min(1, "Weka nenosiri lako la zamani."),
  jipya: nenosiri,
  thibitisha: z.string(),
}).refine((v) => v.jipya === v.thibitisha, {
  message: "Nenosiri jipya hayafanani.",
  path: ["thibitisha"],
});