import type { Business, Scenario } from "../../types";
import { simulate } from "../simulation";
import { inventoryRun } from "./inventory";
export function cashProjection(b: Business, s: Scenario) {
  const p = s.plan,
    noStock = { ...s, plan: { ...p, stockEnabled: false } },
    expected = simulate(b, noStock);
  const inventory = p.stockEnabled
    ? inventoryRun(
        p,
        Array.from({ length: p.months }, () => expected.orders),
      )
    : null;
  const results = Array.from({ length: p.months }, (_, i) =>
    simulate(b, s, inventory?.months[i]),
  );
  // Model months have 30 days. Inflows and expenses are spread evenly;
  // delayed items after the horizon remain receivables/payables, never disappear.
  const receipts = new Map<number, number>(),
    payments = new Map<number, number>();
  const add = (map: Map<number, number>, day: number, value: number) =>
    map.set(day, (map.get(day) ?? 0) + value);
  add(receipts, p.receivableDue, p.openingReceivables);
  add(payments, p.payableDue, p.openingPayables);
  for (let day = 0; day < p.months * 30; day++) {
    const m = Math.floor(day / 30),
      d = day % 30,
      r = results[m];
    const orders = p.stockEnabled
      ? (inventory?.days[day].served ?? 0)
      : Math.floor(((d + 1) * r.orders) / 30) - Math.floor((d * r.orders) / 30);
    add(receipts, day + p.receiveDays, orders * r.price);
    const unitVariable = r.price - r.contribution;
    if (p.stockEnabled) {
      add(
        payments,
        day + p.payDays,
        (inventory?.days[day].purchased ?? 0) * r.ingredientCost,
      );
      add(
        payments,
        day + p.payDays,
        orders * (unitVariable - r.ingredientCost),
      );
    } else add(payments, day + p.payDays, orders * unitVariable);
    add(
      payments,
      day,
      Math.floor(((d + 1) * r.fixedCosts) / 30) -
        Math.floor((d * r.fixedCosts) / 30),
    );
  }
  let cash = p.cash - p.investment,
    minCash = cash,
    firstBelow = cash < p.buffer ? 0 : null,
    firstNegative = cash < 0 ? 0 : null;
  const days = Array.from({ length: p.months * 30 }, (_, day) => {
    cash += (receipts.get(day) ?? 0) - (payments.get(day) ?? 0);
    minCash = Math.min(minCash, cash);
    if (firstBelow === null && cash < p.buffer) firstBelow = day + 1;
    if (firstNegative === null && cash < 0) firstNegative = day + 1;
    return { day: day + 1, cash };
  });
  const periods = results.map((result, i) => ({
    month: i + 1,
    result,
    cash: days[(i + 1) * 30 - 1].cash,
  }));
  const horizon = p.months * 30;
  return {
    periods,
    days,
    minCash,
    firstBelow,
    firstNegative,
    closingCash: cash,
    receivables: [...receipts]
      .filter(([d]) => d >= horizon)
      .reduce((a, [, v]) => a + v, 0),
    payables: [...payments]
      .filter(([d]) => d >= horizon)
      .reduce((a, [, v]) => a + v, 0),
    additionalBuffer: Math.max(0, p.buffer - minCash),
  };
}
