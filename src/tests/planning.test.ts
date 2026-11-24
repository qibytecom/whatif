import { describe, it, expect } from "vitest";
import { demoBusiness as b, baseline } from "../data/demo";
import { simulate, reverse } from "../lib/simulation";
import { decisionAnalysis, startDecision } from "../lib/planning/decision";
import { cashProjection } from "../lib/planning/cash";
import { inventoryRun } from "../lib/planning/inventory";
import { forecast, importSales, salesCSV, shiftDate } from "../lib/forecast";
import { parseBackup, initialData } from "../lib/storage";
import type { Sale } from "../types";
const s = baseline(b);
describe("extended decision model", () => {
  it("finds 892 monthly orders to maintain original profit after 10% price increase", () => {
    const d = decisionAnalysis(b, { ...s, priceChange: 10 });
    expect(d.safe.required).toBe(892);
    expect(d.safe.feasible).toBe(true);
    expect(d.bridge.reduce((a, x) => a + x.value, 0)).toBe(
      d.result.profit - d.base.profit,
    );
  });
  it("shows impossible promotion threshold due to capacity", () => {
    expect(
      reverse(b, { ...s, discount: 15, marketing: 500000 }, 6600000).feasible,
    ).toBe(false);
  });
  it("decomposes exactly with stock waste and channel commission", () => {
    const x = {
      ...s,
      plan: {
        ...s.plan,
        channelShare: 50,
        commission: 20,
        stockEnabled: true,
        initialStock: 2000,
        shelfDays: 2,
      },
    };
    const d = decisionAnalysis(b, x);
    expect(d.bridge.reduce((a, v) => a + v.value, 0)).toBe(
      d.result.profit - d.base.profit,
    );
  });
  it("equipment changes variable cost/capacity, excludes investment from operating profit", () => {
    const r = simulate(b, {
      ...s,
      plan: {
        ...s.plan,
        unitSavings: 1000,
        capacityChange: 20,
        investment: 5000000,
      },
    });
    expect(r.profit).toBe(7640000);
    expect(r.investment).toBe(5000000);
    expect(r.capacity).toBe(70);
  });
  it("supports mixed products and channel costs using explicit weighted average", () => {
    const r = simulate(b, {
      ...s,
      plan: {
        ...s.plan,
        kind: "product",
        products: [
          { id: "1", name: "A", price: 20000, cost: 8000, weight: 1 },
          { id: "2", name: "B", price: 40000, cost: 16000, weight: 1 },
        ],
        channelShare: 50,
        commission: 20,
      },
    });
    expect(r.price).toBe(30000);
    expect(r.contribution).toBe(15000);
    expect(r.profit).toBe(6600000);
  });
  it("derives explicit marketing funnel orders without inventing conversion", () => {
    const r = simulate(b, {
      ...s,
      marketing: 1000000,
      plan: {
        ...s.plan,
        kind: "marketing",
        marketingModel: "funnel",
        visitors: 1000,
        conversion: 10,
        repeat: 20,
      },
    });
    expect(r.orders).toBe(1160);
    expect(r.profit).toBe(7400000);
  });
  it("weights partial promotions, packaging, shipping subsidy and bundles", () => {
    const r = simulate(b, {
      ...s,
      discount: 20,
      plan: {
        ...s.plan,
        bundleUnits: 2,
        bundlePrice: 45000,
        promoShare: 50,
        shippingSubsidy: 2000,
      },
    });
    expect(r.price).toBe(40500);
    expect(r.contribution).toBe(19500);
  });
  it("handles a completely removed capacity without NaN", () => {
    const r = simulate(b, { ...s, plan: { ...s.plan, capacityChange: -50 } });
    expect(r.orders).toBe(0);
    expect(r.utilization).toBe(0);
  });
  it("cash projection reconciles normal income and upfront costs", () => {
    const c = cashProjection(b, {
      ...s,
      plan: { ...s.plan, investment: 5000000, months: 3 },
    });
    expect(c.closingCash).toBe(20000000 - 5000000 + 6600000 * 3);
    expect(c.receivables).toBe(0);
    expect(c.payables).toBe(0);
  });
  it("opening balances affect cash without counting old income/cost twice", () => {
    const x = {
      ...s,
      plan: {
        ...s.plan,
        months: 1,
        openingReceivables: 1000000,
        openingPayables: 2000000,
      },
    };
    expect(cashProjection(b, x).closingCash).toBe(25600000);
    expect(simulate(b, x).profit).toBe(6600000);
  });
  it("extra operating hours add capacity and cost but never demand", () => {
    const r = simulate(b, {
      ...s,
      plan: { ...s.plan, extraHours: 2, ordersPerHour: 10, costPerHour: 50000 },
    });
    expect(r.capacity).toBe(70);
    expect(r.orders).toBe(1040);
    expect(r.profit).toBe(4000000);
  });
  it("stock waste excludes packaging and channel commissions", () => {
    const r = simulate(b, {
      ...s,
      plan: {
        ...s.plan,
        stockEnabled: true,
        initialStock: 2000,
        shelfDays: 1,
        packaging: 2000,
        channelShare: 100,
        commission: 20,
      },
    });
    expect(r.stockWaste).toBeGreaterThan(0);
    expect(r.wasteCosts).toBe(r.stockWaste * 10000);
  });
  it("inventory cash also pays packaging and commissions exactly once", () => {
    const c = cashProjection(b, {
      ...s,
      plan: {
        ...s.plan,
        months: 1,
        stockEnabled: true,
        initialStock: 2000,
        reorderPoint: 0,
        shelfDays: 365,
        packaging: 2000,
        channelShare: 100,
        commission: 20,
      },
    });
    expect(c.closingCash).toBe(29720000);
  });
  it("delayed receipts remain receivables, not disappeared income", () => {
    const c = cashProjection(b, {
      ...s,
      plan: { ...s.plan, months: 1, receiveDays: 30 },
    });
    expect(c.receivables).toBe(26000000);
    expect(c.closingCash).toBe(20000000 - 19400000);
  });
  it("delayed supplier bills remain payables", () => {
    const c = cashProjection(b, {
      ...s,
      plan: { ...s.plan, months: 1, payDays: 30 },
    });
    expect(c.payables).toBe(10400000);
    expect(c.closingCash).toBe(37000000);
  });
  it("inventory loses orders during lead time and balances units", () => {
    const p = {
      ...s.plan,
      stockEnabled: true,
      initialStock: 0,
      reorderPoint: 10,
      orderQuantity: 100,
      leadDays: 2,
      shelfDays: 30,
    };
    const r = inventoryRun(p, [300]);
    expect(r.months[0].lost).toBeGreaterThan(0);
    expect(r.months[0].orders + r.months[0].lost).toBe(300);
    expect(p.initialStock + r.days.reduce((a, d) => a + d.purchased, 0)).toBe(
      r.months[0].orders +
        r.months[0].waste +
        r.months[0].closing +
        r.pendingUnits,
    );
  });
  it("inventory purchases are cash outflow, not counted twice as COGS", () => {
    const x = {
      ...s,
      plan: {
        ...s.plan,
        stockEnabled: true,
        initialStock: 2000,
        reorderPoint: 0,
        shelfDays: 365,
        months: 1,
      },
    };
    expect(cashProjection(b, x).closingCash).toBe(
      20000000 + 26000000 - 9000000,
    );
  });
  it("decision snapshots do not change with later profile edits", () => {
    const d = startDecision(b, s, "2026-11-01", "2026-11-30");
    expect(d.expectedProfit).toBe(6600000);
    const changed = { ...b, price: 1 };
    expect(d.business.price).not.toBe(changed.price);
    expect(d.scenario).not.toBe(s);
  });
  it("legacy version 1 backups receive additive defaults", () => {
    const raw = JSON.parse(JSON.stringify(initialData()));
    delete raw.history;
    delete raw.decisions;
    raw.scenarios = [{ ...s }];
    delete raw.scenarios[0].plan;
    const parsed = parseBackup(JSON.stringify(raw));
    expect(parsed.history).toEqual([]);
    expect(parsed.scenarios[0].plan.kind).toBe("basic");
  });
});
describe("historical forecast and CSV", () => {
  const history: Sale[] = Array.from({ length: 56 }, (_, i) => ({
    date: shiftDate("2026-09-01", i),
    orders: i % 7 === 0 ? 0 : 40 + (i % 7),
    price: 25000,
    cost: 10000,
    event: i % 7 === 0 ? "closed" : "normal",
    note: "",
  }));
  it("does not fabricate a forecast with insufficient data", () =>
    expect(forecast(history.slice(0, 5), 30, "2026-11-01").available).toBe(
      false,
    ));
  it("uses rolling tests and produces future dates", () => {
    const f = forecast(history, 30, "2026-10-26");
    expect(f.available).toBe(true);
    if (f.available) {
      expect(f.rows).toHaveLength(30);
      expect(f.rows[0].date).toBe("2026-10-27");
      expect(f.method).toBe("Pola hari dalam minggu");
      expect(f.mae).toBe(0);
    }
  });
  it("does not leak future observations into training", () => {
    const a = forecast(history, 7, "2026-10-01");
    const c = forecast(
      [...history, { ...history[0], date: "2026-12-31", orders: 999999 }],
      7,
      "2026-10-01",
    );
    expect(a).toEqual(c);
  });
  it("bounds rolling evaluation work for long histories", () => {
    const long: Sale[] = Array.from({ length: 1000 }, (_, i) => ({
      ...history[i % history.length],
      date: shiftDate("2020-01-01", i),
    }));
    const f = forecast(long, 90, "2023-01-01");
    expect(f.available).toBe(true);
    if (f.available) {
      expect(f.testCount).toBe(90);
      expect(f.rows.every((x) => Number.isFinite(x.orders))).toBe(true);
    }
  });
  it("excludes promo and stockout observations from normal baseline", () => {
    const f = forecast(
      [...history, { ...history[0], date: "2026-10-28", event: "stockout" }],
      7,
      "2026-10-28",
    );
    expect(f.excluded).toBe(1);
  });
  it("CSV round trip, quoted commas and lines, duplicate rejection", () => {
    const rows = [{ ...history[0], note: 'Ada, "catatan"\nbaris' }];
    expect(importSales(salesCSV(rows), 0, 0)).toEqual(rows);
    expect(() =>
      importSales("tanggal,pesanan\n2026-01-01,1\n2026-01-01,2", 0, 0),
    ).toThrow();
    expect(() => importSales("tanggal,pesanan\n2026-02-30,2", 0, 0)).toThrow();
  });
});
