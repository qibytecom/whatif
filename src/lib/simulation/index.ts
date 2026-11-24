import type { Business, Scenario, Result } from "../../types";
import { baseline } from "../../data/demo";
import { rupiah } from "../formatters";
import { inventoryRun } from "../planning/inventory";
import type { InventoryMonth } from "../planning/inventory";
export function simulate(
  b: Business,
  s: Scenario = baseline(b),
  stock?: InventoryMonth,
): Result {
  const p = s.plan;
  const totalWeight = p.products.reduce((a, x) => a + x.weight, 0);
  const productMode = totalWeight > 0;
  const basePrice = productMode
    ? p.products.reduce((a, x) => a + x.price * x.weight, 0) / totalWeight
    : b.price;
  const baseCost = productMode
    ? p.products.reduce((a, x) => a + x.cost * x.weight, 0) / totalWeight
    : s.cost;
  const orderPrice =
    p.bundlePrice > 0 ? p.bundlePrice : basePrice * p.bundleUnits;
  const price = Math.round(
    orderPrice *
      (1 + s.priceChange / 100) *
      (1 - (s.discount * p.promoShare) / 10000),
  );
  const commissionUnit = Math.round(
    (price * p.channelShare * p.commission) / 10000,
  );
  const ingredientCost = Math.max(
    0,
    Math.round(baseCost * p.bundleUnits - p.unitSavings),
  );
  const unitCost =
    ingredientCost +
    p.packaging +
    Math.round((p.shippingSubsidy * p.promoShare) / 100);
  const operatingDays = Math.min(31, Math.max(1, b.days + p.extraDays));
  const funnelOrders =
    p.marketingModel === "funnel"
      ? ((p.visitors * p.conversion) / 100) * (1 + p.repeat / 100)
      : 0;
  const demand =
      b.demand * (1 + s.demandChange / 100) + funnelOrders / operatingDays,
    capacity = Math.max(
      0,
      b.capacity +
        s.employees * s.addedCapacity +
        p.capacityChange +
        p.extraHours * p.ordersPerHour,
    );
  const wanted = Math.floor(Math.min(demand, capacity) * operatingDays + 1e-9);
  const inventory = p.stockEnabled
    ? (stock ?? inventoryRun(p, [wanted]).months[0])
    : undefined;
  const orders = inventory?.orders ?? wanted,
    stockWaste = inventory?.waste ?? 0;
  const revenue = orders * price,
    commissionCosts = orders * commissionUnit;
  const wasteCosts = stockWaste * ingredientCost;
  const variableCosts = orders * unitCost + commissionCosts + wasteCosts;
  const employeeCosts = s.employees * s.salary,
    additionalCosts =
      s.marketing +
      employeeCosts +
      p.extraFixed +
      Math.round(p.extraHours * operatingDays * p.costPerHour);
  const fixedCosts = b.fixed + additionalCosts,
    totalCosts = variableCosts + fixedCosts,
    profit = revenue - totalCosts;
  return {
    price,
    demand,
    capacity,
    dailyOrders: orders / operatingDays,
    orders,
    revenue,
    variableCosts,
    employeeCosts,
    additionalCosts,
    fixedCosts,
    totalCosts,
    profit,
    contribution: price - unitCost - commissionUnit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    unserved: Math.max(0, demand - capacity),
    utilization: capacity > 0 ? (orders / operatingDays / capacity) * 100 : 0,
    investment: p.investment,
    stockLost: inventory?.lost ?? 0,
    stockWaste,
    stockClosing: inventory?.closing ?? 0,
    stockPurchases: inventory?.purchases ?? 0,
    stockPurchaseCost: (inventory?.purchases ?? 0) * ingredientCost,
    commissionCosts,
    operatingDays,
    ingredientCost,
    wasteCosts,
  };
}
export function reverse(b: Business, s: Scenario, target: number) {
  const r = simulate(b, s);
  const required =
    r.contribution > 0
      ? Math.max(
          0,
          Math.ceil((target + r.fixedCosts + r.wasteCosts) / r.contribution),
        )
      : target <= -r.fixedCosts - r.wasteCosts
        ? 0
        : null;
  const maxOrders = Math.floor(r.capacity * r.operatingDays);
  const full = s.plan.stockEnabled
    ? simulate(
        { ...b, demand: r.capacity },
        {
          ...s,
          demandChange: 0,
          plan: { ...s.plan, marketingModel: "manual" },
        },
      )
    : null;
  const stockFeasible = full
    ? r.profit >= target || full.profit >= target
    : true;
  return {
    required,
    daily: required === null ? null : required / r.operatingDays,
    maxOrders,
    feasible: required !== null && required <= maxOrders && stockFeasible,
    demandGap:
      required === null
        ? null
        : Math.max(0, required / r.operatingDays - r.demand),
    maxProfit: full
      ? Math.max(r.profit, full.profit)
      : Math.max(-r.fixedCosts, maxOrders * r.contribution - r.fixedCosts),
    stockConditional: s.plan.stockEnabled,
  };
}
export function stressTest(b: Business, s: Scenario, changes: number[]) {
  return changes.map((change, i) => ({
    name: ["Pesimistis", "Dasar", "Optimistis"][i],
    change,
    result: simulate(b, {
      ...s,
      demandChange: ((1 + s.demandChange / 100) * (1 + change / 100) - 1) * 100,
      plan: { ...s.plan, visitors: s.plan.visitors * (1 + change / 100) },
    }),
  }));
}
export function insights(b: Business, s: Scenario): string[] {
  const a = simulate(b),
    r = simulate(b, s),
    delta = r.profit - a.profit;
  const messages = [
    delta === 0
      ? `Berdasarkan asumsi saat ini, keuntungan tetap ${rupiah(r.profit)} per bulan, sama dengan kondisi awal.`
      : `Berdasarkan asumsi saat ini, keuntungan ${delta > 0 ? "bertambah" : "berkurang"} ${rupiah(Math.abs(delta))} per bulan dibanding kondisi awal.`,
  ];
  if (r.contribution <= 0)
    messages.push(
      "Margin kontribusi tidak positif. Tinjau harga atau biaya per pesanan.",
    );
  if (r.unserved > 0)
    messages.push(
      `Kapasitas membatasi penjualan. ${r.unserved.toLocaleString("id-ID", { maximumFractionDigits: 1 })} pesanan per hari belum bisa dilayani.`,
    );
  if (r.stockLost > 0)
    messages.push(
      `${r.stockLost} pesanan per bulan tidak terpenuhi karena stok habis.`,
    );
  const extra = r.orders * r.contribution - a.orders * a.contribution;
  if (s.marketing > Math.max(0, extra))
    messages.push(
      "Biaya pemasaran melebihi tambahan margin kontribusi penjualan.",
    );
  if (r.employeeCosts > Math.max(0, extra))
    messages.push(
      "Biaya karyawan baru melebihi tambahan margin kontribusi. Kapasitas tidak otomatis menciptakan permintaan.",
    );
  if (stressTest(b, s, [-20, 0, 20])[0].result.profit < 0 && r.profit >= 0)
    messages.push(
      "Pada penurunan permintaan 20%, keputusan ini mengalami rugi.",
    );
  return messages;
}
