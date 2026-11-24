import { z } from "zod";
const money = z.number().finite().int().min(0).max(1e12);
export const productSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(100),
  price: money,
  cost: money,
  weight: z.number().finite().min(0).max(100000),
});
export const planSchema = z.object({
  kind: z
    .enum([
      "basic",
      "marketing",
      "hours",
      "stock",
      "equipment",
      "product",
      "channel",
      "expansion",
      "resilience",
    ])
    .default("basic"),
  extraDays: z.number().int().min(-30).max(30).default(0),
  capacityChange: z.number().finite().min(-1e6).max(1e6).default(0),
  extraFixed: money.default(0),
  investment: money.default(0),
  unitSavings: money.default(0),
  channelShare: z.number().min(0).max(100).default(0),
  commission: z.number().min(0).max(100).default(0),
  packaging: money.default(0),
  products: z.array(productSchema).max(20).default([]),
  stockEnabled: z.boolean().default(false),
  initialStock: z.number().int().min(0).max(1e7).default(100),
  reorderPoint: z.number().int().min(0).max(1e7).default(50),
  orderQuantity: z.number().int().positive().max(1e7).default(200),
  leadDays: z.number().int().min(1).max(90).default(2),
  shelfDays: z.number().int().min(1).max(3650).default(30),
  cash: money.default(20000000),
  buffer: money.default(5000000),
  receiveDays: z.number().int().min(0).max(90).default(0),
  payDays: z.number().int().min(0).max(90).default(0),
  months: z.number().int().min(1).max(12).default(3),
});
export const extendedPlanSchema = planSchema.extend({
  demandSource: z.enum(["assumption", "history"]).default("assumption"),
  forecastNote: z.string().max(500).default(""),
  marketingModel: z.enum(["manual", "funnel"]).default("manual"),
  visitors: z.number().int().min(0).max(1e7).default(1000),
  conversion: z.number().min(0).max(100).default(2),
  repeat: z.number().min(0).max(100).default(0),
  promoShare: z.number().min(0).max(100).default(100),
  shippingSubsidy: money.default(0),
  bundleUnits: z.number().int().min(1).max(20).default(1),
  bundlePrice: money.default(0),
});
export const fullPlanSchema = extendedPlanSchema.extend({
  extraHours: z.number().min(0).max(12).default(0),
  ordersPerHour: z.number().min(0).max(1e5).default(10),
  costPerHour: money.default(0),
  openingReceivables: money.default(0),
  openingPayables: money.default(0),
  receivableDue: z.number().int().min(0).max(90).default(0),
  payableDue: z.number().int().min(0).max(90).default(0),
});
export const defaultPlan = () => fullPlanSchema.parse({});
export const saleSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (v) =>
          !Number.isNaN(Date.parse(v)) &&
          new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v,
        "Tanggal tidak valid.",
      ),
    orders: z.number().int().min(0).max(1e6),
    price: money,
    cost: money,
    event: z.enum([
      "normal",
      "promo",
      "price",
      "closed",
      "stockout",
      "special",
    ]),
    note: z.string().max(300).default(""),
  })
  .refine(
    (v) => v.event !== "closed" || v.orders === 0,
    "Hari tutup harus memiliki nol pesanan.",
  );
export const historySchema = z
  .array(saleSchema)
  .max(10000)
  .refine(
    (rows) => new Set(rows.map((r) => r.date)).size === rows.length,
    "Tanggal penjualan tidak boleh ganda.",
  );
