import type { Business, Scenario } from "../../types";
import { simulate, reverse, stressTest } from "../simulation";
import { baseline } from "../../data/demo";
import { rupiah, number } from "../formatters";
import { cashProjection } from "./cash";
export function decisionAnalysis(b: Business, s: Scenario) {
  const a = simulate(b),
    r = simulate(b, s),
    safe = reverse(b, s, a.profit);
  const required = safe.required;
  const safeDecline =
    required !== null && a.orders > 0 ? (1 - required / a.orders) * 100 : null;
  // An additive decomposition is exact for this average-order model.
  const priceEffect = a.orders * (r.contribution - a.contribution),
    volumeEffect = (r.orders - a.orders) * r.contribution;
  const fixedEffect = -(r.fixedCosts - a.fixedCosts),
    wasteEffect = -(r.variableCosts - r.orders * (r.price - r.contribution));
  const bridge = [
    { name: "Harga & biaya per pesanan", value: priceEffect },
    { name: "Perubahan jumlah pesanan", value: volumeEffect },
    { name: "Biaya rutin tambahan", value: fixedEffect },
    { name: "Stok terbuang", value: wasteEffect },
  ];
  const variants = [
    { name: "Rencana Anda", s },
    {
      name: "Uji dengan separuh biaya & kapasitas tambahan",
      s: {
        ...s,
        marketing: Math.round(s.marketing / 2),
        salary: Math.round(s.salary / 2),
        addedCapacity: s.addedCapacity / 2,
        plan: {
          ...s.plan,
          extraFixed: Math.round(s.plan.extraFixed / 2),
          investment: Math.round(s.plan.investment / 2),
          capacityChange: s.plan.capacityChange / 2,
        },
      },
    },
    {
      name: "Permintaan belum bertambah",
      s: { ...s, demandChange: Math.min(0, s.demandChange) },
    },
  ].map((v) => ({ ...v, result: simulate(b, v.s) }));
  const constraints = [
    ...(r.contribution <= 0 ? ["Harga belum menutup biaya per pesanan."] : []),
    ...(r.unserved > 0
      ? [`${number(r.unserved)} pesanan per hari melebihi kapasitas layanan.`]
      : []),
    ...(r.stockLost > 0 ? [`${r.stockLost} pesanan hilang karena stok.`] : []),
    ...(s.plan.investment > s.plan.cash
      ? ["Modal awal melebihi saldo kas yang diisi."]
      : []),
  ];
  const conservative = stressTest(b, s, [-20, 0, 20])[0].result;
  const testAction =
    required === null
      ? "Uji perbaikan harga atau biaya per pesanan terlebih dahulu."
      : !safe.feasible
        ? "Tinjau kapasitas, stok, atau biaya sebelum menjalankan rencana penuh."
        : `Uji pada periode terbatas. Pantau agar penjualan setara minimal ${number(required)} pesanan per bulan untuk menjaga keuntungan awal.`;
  return {
    base: a,
    result: r,
    safe,
    safeDecline,
    bridge,
    variants,
    constraints,
    conservative,
    testAction,
  };
}
export function recommendation(
  b: Business,
  scenarios: Scenario[],
  goal: "profit" | "cash" | "capacity" | "resilient",
) {
  return scenarios
    .map((s) => {
      const r = simulate(b, s),
        low = stressTest(b, s, [-20, 0, 20])[0].result;
      const cash = cashProjection(b, {
        ...s,
        plan: {
          ...s.plan,
          cash: scenarios[0]?.plan.cash ?? s.plan.cash,
          months: scenarios[0]?.plan.months ?? s.plan.months,
        },
      });
      const score =
        goal === "cash"
          ? cash.minCash
          : goal === "capacity"
            ? -(r.unserved + r.stockLost / r.operatingDays)
            : goal === "resilient"
              ? low.profit
              : r.profit;
      return {
        s,
        r,
        score,
        reason:
          goal === "cash"
            ? `Kas terendah ${rupiah(cash.minCash)}, dengan saldo awal dan periode disamakan ke skenario pertama.`
            : goal === "capacity"
              ? `${number(r.unserved + r.stockLost / r.operatingDays)} permintaan per hari belum terlayani, termasuk keterbatasan stok.`
              : goal === "resilient"
                ? `Keuntungan ${rupiah(low.profit)} ketika permintaan turun 20%.`
                : `Keuntungan simulasi ${rupiah(r.profit)} per bulan.`,
      };
    })
    .sort((a, b) => b.score - a.score);
}
export function startDecision(
  b: Business,
  s: Scenario,
  start: string,
  end: string,
) {
  const r = simulate(b, s),
    days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  return {
    id: crypto.randomUUID(),
    business: structuredClone(b),
    scenario: structuredClone(s),
    start,
    end,
    status: "running" as const,
    expectedOrders: Math.floor((r.orders * days) / 30),
    expectedProfit: Math.round((r.profit * days) / 30),
    actualOrders: null,
    actualRevenue: null,
    actualVariable: null,
    actualFixed: null,
    note: "",
  };
}
export function emptyVariant(b: Business) {
  return baseline(b);
}
