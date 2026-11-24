import type { Business, Scenario } from "../../types";
import { simulate } from "../../lib/simulation";
import { baseline } from "../../data/demo";
export function comparisonCSV(b: Business, scenarios: Scenario[]) {
  const escape = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const headers = [
    "Skenario",
    "Omzet (Rp)",
    "Laba operasional (Rp)",
    "Selisih laba (Rp)",
    "Pesanan bulanan",
    "Permintaan tak terlayani per hari",
    "Kapasitas terpakai (%)",
    "Biaya tambahan (Rp)",
    "Margin operasional (%)",
  ];
  const base = simulate(b);
  return (
    "\uFEFF" +
    [
      headers,
      ...[baseline(b), ...scenarios].map((s) => {
        const r = simulate(b, s);
        return [
          s.name,
          r.revenue,
          r.profit,
          r.profit - base.profit,
          r.orders,
          r.unserved,
          r.utilization,
          r.additionalCosts,
          r.margin,
        ];
      }),
    ]
      .map((row) => row.map(escape).join(","))
      .join("\r\n")
  );
}
