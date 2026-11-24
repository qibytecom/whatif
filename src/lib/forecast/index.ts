import type { Sale } from "../../types";
import { historySchema } from "../validation/planning";
export const eventLabels = {
  normal: "Normal",
  promo: "Promo",
  price: "Harga berubah",
  closed: "Tutup",
  stockout: "Stok habis",
  special: "Kejadian khusus",
} as const;
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(date + "T00:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
const weekday = (date: string) => new Date(date + "T00:00:00Z").getUTCDay();
const mean = (values: number[]) =>
  values.reduce((a, x) => a + x, 0) / Math.max(1, values.length);
type Method = "weekday" | "average" | "recent";
const names: Record<Method, string> = {
  weekday: "Pola hari dalam minggu",
  average: "Rata-rata 14 catatan terakhir",
  recent: "Rata-rata 7 catatan terakhir",
};
function predict(rows: Sale[], date: string, method: Method) {
  const selected =
    method === "weekday"
      ? rows
          .slice(-56)
          .filter((r) => weekday(r.date) === weekday(date))
          .slice(-4)
      : rows.slice(method === "recent" ? -7 : -14);
  return mean(
    (selected.length ? selected : rows.slice(-14)).map((r) => r.orders),
  );
}
export function forecast(history: Sale[], horizon = 30, asOf = today()) {
  const past = history
    .filter((r) => r.date <= asOf)
    .sort((a, b) => a.date.localeCompare(b.date));
  // Stockout sales are censored; changed-price/promotional periods are not a
  // counterfactual baseline. Closed days remain valid zeros for weekday patterns.
  const usable = past.filter(
    (r) => r.event === "normal" || r.event === "closed",
  );
  if (usable.length < 21)
    return {
      available: false as const,
      usable: usable.length,
      excluded: past.length - usable.length,
      reason: `Tersedia ${usable.length} catatan normal/tutup. Tambahkan minimal 21 catatan dengan cakupan hari yang memadai untuk uji bergulir awal.`,
    };
  const coverage = new Set(usable.map((r) => weekday(r.date)));
  if (coverage.size < 5)
    return {
      available: false as const,
      usable: usable.length,
      excluded: past.length - usable.length,
      reason:
        "Catatan belum mencakup cukup variasi hari. Tambahkan hari sepi, ramai, dan hari tutup agar perkiraan tidak berat sebelah.",
    };
  const methods: Method[] = ["weekday", "average", "recent"];
  const scores = methods
    .map((method) => {
      const errors: number[] = [];
      for (let i = Math.max(14, usable.length - 90); i < usable.length; i++) {
        const value = predict(usable.slice(0, i), usable[i].date, method);
        errors.push(Math.abs(value - usable[i].orders));
      }
      return { method, name: names[method], mae: mean(errors), errors };
    })
    .sort((a, b) => a.mae - b.mae);
  const selected = scores[0],
    sorted = [...selected.errors].sort((a, b) => a - b);
  const error =
    sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.8) - 1)] ??
    0;
  const last = usable.at(-1)!.date,
    stale = Math.round((Date.parse(asOf) - Date.parse(last)) / 86400000);
  const rows = Array.from({ length: horizon }, (_, i) => {
    const date = shiftDate(asOf, i + 1),
      orders = Math.max(0, predict(usable, date, selected.method));
    return {
      date,
      orders,
      low: Math.max(0, orders - error),
      high: orders + error,
    };
  });
  const span =
    Math.round((Date.parse(last) - Date.parse(usable[0].date)) / 86400000) + 1;
  return {
    available: true as const,
    usable: usable.length,
    excluded: past.length - usable.length,
    method: selected.name,
    mae: selected.mae,
    testCount: selected.errors.length,
    stale,
    missingDays: Math.max(
      0,
      span -
        past.filter((r) => r.date >= usable[0].date && r.date <= last).length,
    ),
    referencePrice:
      usable.filter((r) => r.event === "normal").at(-1)?.price ?? 0,
    rows,
    total: Math.round(rows.reduce((a, r) => a + r.orders, 0)),
    daily: mean(rows.map((r) => r.orders)),
    last,
    scoreboard: scores.map((x) => ({ name: x.name, mae: x.mae })),
    rangeNote:
      "Rentang sensitivitas menggunakan persentil 80 galat absolut uji harian; bukan interval probabilitas masa depan. Uji satu langkah harian, belum mengukur akurasi horizon penuh.",
  };
}
// RFC-4180 style parser: quoted delimiters, quotes and newlines are supported.
export function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted) quoted = false;
      else if (cell === "") quoted = true;
      else throw new Error("Tanda kutip CSV tidak valid.");
    } else if (
      !quoted &&
      (c === "," || c === ";" || c === "\n" || c === "\r")
    ) {
      if (c === ";" && text.split(/\r?\n/, 1)[0].includes(",")) {
        cell += c;
        continue;
      }
      row.push(cell);
      cell = "";
      if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        if (row.some((v) => v.trim())) rows.push(row);
        row = [];
      }
    } else cell += c;
  }
  if (quoted) throw new Error("Tanda kutip CSV belum ditutup.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function importSales(
  text: string,
  defaultPrice: number,
  defaultCost: number,
) {
  const rows = parseCSV(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("CSV belum berisi data.");
  const aliases: Record<string, string> = {
    date: "tanggal",
    tgl: "tanggal",
    orders: "pesanan",
    jumlah: "pesanan",
    price: "harga",
    cost: "biaya",
    hpp: "biaya",
    event: "kejadian",
    note: "catatan",
  };
  const headers = rows[0].map((x) => {
    const key = x.trim().toLowerCase();
    return aliases[key] ?? key;
  });
  if (new Set(headers).size !== headers.length)
    throw new Error("Kolom CSV tidak boleh ganda.");
  const at = (row: string[], name: string, fallback = "") =>
    row[headers.indexOf(name)]?.trim() ?? fallback;
  const data = rows.slice(1).map((r, i) => {
    if (r.length !== headers.length)
      throw new Error(`Baris ${i + 2}: jumlah kolom tidak sesuai header.`);
    const date = at(r, "tanggal"),
      rawOrders = at(r, "pesanan");
    if (!date || !rawOrders)
      throw new Error(`Baris ${i + 2}: tanggal dan pesanan wajib diisi.`);
    return {
      date,
      orders: Number(rawOrders),
      price: Number(at(r, "harga", String(defaultPrice))),
      cost: Number(at(r, "biaya", String(defaultCost))),
      event: at(r, "kejadian", "normal"),
      note: at(r, "catatan"),
    };
  });
  const valid = historySchema.safeParse(data);
  if (!valid.success)
    throw new Error(`CSV tidak valid: ${valid.error.issues[0].message}`);
  return valid.data;
}
export function salesCSV(history: Sale[]) {
  const escape = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  return (
    "\uFEFF" +
    [
      ["tanggal", "pesanan", "harga", "biaya", "kejadian", "catatan"],
      ...history.map((r) => [
        r.date,
        r.orders,
        r.price,
        r.cost,
        r.event,
        /^[=+\-@\t\r]/.test(r.note) ? `'${r.note}` : r.note,
      ]),
    ]
      .map((r) => r.map(escape).join(","))
      .join("\r\n")
  );
}
