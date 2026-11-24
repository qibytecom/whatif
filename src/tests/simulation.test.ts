import { describe, it, expect } from "vitest";
import { demoBusiness as b, baseline } from "../data/demo";
import { simulate, reverse, stressTest, insights } from "../lib/simulation";
import { parseBackup, initialData } from "../lib/storage";
import { comparisonCSV } from "../features/reports/export";
const s = baseline(b);
describe("moteur de simulation", () => {
  it("calculates demo baseline profit Rp6.600.000", () => {
    const r = simulate(b);
    expect(r.profit).toBe(6600000);
    expect(r.orders).toBe(1040);
    expect(r.revenue).toBe(26000000);
    expect(r.contribution).toBe(15000);
    expect(r.utilization).toBe(80);
  });
  it("calculates increased price with explicit demand reduction", () => {
    const r = simulate(b, { ...s, priceChange: 10, demandChange: -5 });
    expect(r.price).toBe(27500);
    expect(r.orders).toBe(988);
    expect(r.profit).toBe(8290000);
  });
  it("calculates price reduction without inventing demand", () => {
    const r = simulate(b, { ...s, priceChange: -10 });
    expect(r.orders).toBe(1040);
    expect(r.profit).toBe(4000000);
  });
  it("applies compounded discount to every order and marketing once", () => {
    const r = simulate(b, {
      ...s,
      priceChange: 10,
      discount: 20,
      marketing: 500000,
    });
    expect(r.price).toBe(22000);
    expect(r.profit).toBe(2980000);
  });
  it("caps demand at capacity", () => {
    const r = simulate(b, { ...s, demandChange: 100 });
    expect(r.orders).toBe(1300);
    expect(r.unserved).toBe(30);
    expect(r.utilization).toBe(100);
  });
  it("adds payroll but not demand when staffing changes", () => {
    const r = simulate(b, { ...s, employees: 2 });
    expect(r.demand).toBe(40);
    expect(r.capacity).toBe(90);
    expect(r.employeeCosts).toBe(6000000);
    expect(r.profit).toBe(600000);
  });
  it("handles zero demand and no revenue", () => {
    const r = simulate({ ...b, demand: 0 });
    expect(r.revenue).toBe(0);
    expect(r.profit).toBe(-9000000);
    expect(r.margin).toBe(0);
  });
  it("handles zero contribution and impossible target", () => {
    const zero = { ...s, cost: 25000 };
    expect(simulate(b, zero).profit).toBe(-9000000);
    expect(reverse(b, zero, 15000000).feasible).toBe(false);
    expect(reverse(b, zero, 15000000).required).toBeNull();
  });
  it("handles costs above price and negative profit", () => {
    const r = simulate(b, { ...s, cost: 30000 });
    expect(r.contribution).toBe(-5000);
    expect(r.profit).toBe(-14200000);
    expect(insights(b, { ...s, cost: 30000 }).join(" ")).toContain(
      "tidak positif",
    );
  });
  it("reverse target respects salaries and marketing", () => {
    const r = reverse(b, { ...s, employees: 1, marketing: 500000 }, 10000000);
    expect(r.required).toBe(1500);
    expect(r.feasible).toBe(true);
    expect(r.demandGap).toBeCloseTo(17.69230769);
  });
  it("reverse detects insufficient capacity for Rp15m target", () => {
    const r = reverse(b, s, 15000000);
    expect(r.required).toBe(1600);
    expect(r.maxOrders).toBe(1300);
    expect(r.feasible).toBe(false);
    expect(r.maxProfit).toBe(10500000);
  });
  it("rounds monthly fractional orders down only once", () => {
    const r = simulate({ ...b, demand: 1.51, days: 26 });
    expect(r.orders).toBe(39);
    expect(r.revenue).toBe(975000);
  });
  it("rounds compounded unit price to whole Rupiah", () =>
    expect(
      simulate(b, { ...s, priceChange: 3.337, discount: 7.77 }).price,
    ).toBe(Math.round(25000 * 1.03337 * 0.9223)));
  it("uses relative sensitivity and caps optimistic volume", () => {
    const rows = stressTest(b, { ...s, demandChange: 10 }, [-20, 0, 20]);
    expect(rows[0].result.demand).toBeCloseTo(35.2);
    expect(rows[1].result.demand).toBe(44);
    expect(rows[2].result.orders).toBe(1300);
  });
  it("generates marketing and staffing explanations from numbers", () => {
    expect(insights(b, { ...s, marketing: 1000000 }).join(" ")).toContain(
      "Biaya pemasaran",
    );
    expect(insights(b, { ...s, employees: 1 }).join(" ")).toContain(
      "Biaya karyawan",
    );
  });
  it("exports and reimports exact versioned data", () => {
    const data = { ...initialData(), scenarios: [{ ...s, id: "saved" }] };
    expect(parseBackup(JSON.stringify(data))).toEqual(data);
  });
  it("rejects corrupt, future, negative, and duplicate backup data", () => {
    expect(() => parseBackup("bad")).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ ...initialData(), version: 2 })),
    ).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({ ...initialData(), business: { ...b, price: -1 } }),
      ),
    ).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ ...initialData(), scenarios: [s, s] })),
    ).toThrow();
  });
  it("CSV uses calculated exact values and escapes names", () => {
    const csv = comparisonCSV(b, [{ ...s, name: 'Promo, "Senja"' }]);
    expect(csv).toContain('"26000000","6600000","0","1040"');
    expect(csv).toContain('"Promo, ""Senja"""');
  });
});
