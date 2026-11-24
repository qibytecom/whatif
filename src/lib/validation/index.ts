import { z } from "zod";
import { defaultPlan, fullPlanSchema, historySchema } from "./planning";
z.setErrorMap((issue, ctx) => ({
  message:
    issue.code === "invalid_type"
      ? "Isi nilai dengan format yang benar."
      : issue.code === "too_small"
        ? "Nilai di bawah batas yang diizinkan."
        : issue.code === "too_big"
          ? "Nilai melebihi batas yang diizinkan."
          : issue.code === "invalid_enum_value"
            ? "Pilihan tidak dikenali."
            : ctx.defaultError,
}));
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v + "T00:00:00Z")) &&
      new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v,
    "Tanggal tidak valid.",
  );
const money = z
  .number()
  .finite()
  .int("Gunakan Rupiah bulat.")
  .min(0, "Tidak boleh negatif.")
  .max(1e12, "Nilai terlalu besar.");
export const businessSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi.").max(100),
  category: z.string().trim().min(1).max(100),
  product: z.string().trim().min(1).max(100),
  price: money,
  cost: money,
  demand: z.number().finite().min(0).max(1e6),
  capacity: z
    .number()
    .finite()
    .positive("Kapasitas harus lebih dari nol.")
    .max(1e6),
  days: z.number().int().min(1).max(31),
  fixed: money,
  salariesIncluded: z.literal(true),
  demo: z.boolean(),
});
export const scenarioSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1, "Nama skenario wajib diisi.").max(100),
    priceChange: z.number().finite().min(-100).max(1000),
    discount: z.number().finite().min(0).max(100),
    demandChange: z.number().finite().min(-100).max(1000),
    cost: money,
    marketing: money,
    employees: z.number().int().min(0).max(1000),
    salary: money,
    addedCapacity: z.number().finite().min(0).max(1e6),
    updatedAt: z.string().datetime(),
    plan: fullPlanSchema.default(defaultPlan),
  })
  .superRefine((s, ctx) => {
    if (
      (s.plan.kind === "product" || s.plan.products.length > 0) &&
      s.plan.products.reduce((a, p) => a + p.weight, 0) <= 0
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tambahkan produk dengan total bobot lebih dari nol.",
        path: ["plan", "products"],
      });
  });
export const decisionSchema = z
  .object({
    id: z.string().min(1).max(100),
    scenario: scenarioSchema,
    business: businessSchema,
    start: dateOnly,
    end: dateOnly,
    status: z.enum(["running", "completed"]),
    expectedOrders: z.number().int().min(0),
    expectedProfit: z.number().finite(),
    actualOrders: z.number().int().min(0).nullable(),
    actualRevenue: money.nullable(),
    actualVariable: money.nullable(),
    actualFixed: money.nullable(),
    note: z.string().max(2000).default(""),
  })
  .refine(
    (d) =>
      d.end >= d.start &&
      Date.parse(d.end) - Date.parse(d.start) < 365 * 86400000,
    "Tanggal akhir harus sesudah tanggal mulai dan periode maksimal 365 hari.",
  )
  .refine(
    (d) =>
      d.status !== "completed" ||
      [d.actualOrders, d.actualRevenue, d.actualVariable, d.actualFixed].every(
        (x) => x !== null,
      ),
    "Lengkapi hasil aktual sebelum menyelesaikan evaluasi.",
  );
export const backupSchema = z.object({
  version: z.literal(1),
  business: businessSchema,
  scenarios: z
    .array(scenarioSchema)
    .max(500)
    .refine(
      (a) => new Set(a.map((s) => s.id)).size === a.length,
      "ID skenario harus unik.",
    ),
  target: money,
  stress: z.tuple([
    z.number().min(-100).max(1000),
    z.number().min(-100).max(1000),
    z.number().min(-100).max(1000),
  ]),
  onboarded: z.boolean(),
  history: historySchema.default([]),
  decisions: z
    .array(decisionSchema)
    .max(1000)
    .refine(
      (rows) => new Set(rows.map((r) => r.id)).size === rows.length,
      "ID keputusan harus unik.",
    )
    .default([]),
});
