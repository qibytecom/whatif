import type { Plan } from "../../types";
export interface InventoryDay {
  served: number;
  lost: number;
  waste: number;
  purchased: number;
  closing: number;
}
export interface InventoryMonth {
  orders: number;
  lost: number;
  waste: number;
  closing: number;
  purchases: number;
}
export function inventoryRun(plan: Plan, monthlyOrders: number[]) {
  const lots: { units: number; expires: number }[] = [
    { units: plan.initialStock, expires: plan.shelfDays },
  ];
  const pending: { units: number; arrives: number }[] = [];
  const days: InventoryDay[] = [];
  for (let day = 0; day < monthlyOrders.length * 30; day++) {
    let waste = 0;
    for (const lot of lots)
      if (lot.expires <= day) {
        waste += lot.units;
        lot.units = 0;
      }
    for (const shipment of pending)
      if (shipment.arrives === day) {
        lots.push({ units: shipment.units, expires: day + plan.shelfDays });
        shipment.units = 0;
      }
    const target = monthlyOrders[Math.floor(day / 30)],
      d = day % 30;
    const wanted =
      Math.floor(((d + 1) * target) / 30) - Math.floor((d * target) / 30);
    let remaining = wanted;
    for (const lot of lots) {
      const used = Math.min(remaining, lot.units);
      lot.units -= used;
      remaining -= used;
      if (!remaining) break;
    }
    const closing = lots.reduce((a, l) => a + l.units, 0);
    let purchased = 0;
    if (
      closing + pending.reduce((a, p) => a + p.units, 0) <=
      plan.reorderPoint
    ) {
      purchased = plan.orderQuantity;
      pending.push({ units: purchased, arrives: day + plan.leadDays });
    }
    days.push({
      served: wanted - remaining,
      lost: remaining,
      waste,
      purchased,
      closing,
    });
  }
  const months: InventoryMonth[] = monthlyOrders.map((_, i) => {
    const slice = days.slice(i * 30, (i + 1) * 30);
    return {
      orders: slice.reduce((a, d) => a + d.served, 0),
      lost: slice.reduce((a, d) => a + d.lost, 0),
      waste: slice.reduce((a, d) => a + d.waste, 0),
      purchases: slice.reduce((a, d) => a + d.purchased, 0),
      closing: slice.at(-1)?.closing ?? 0,
    };
  });
  return {
    days,
    months,
    pendingUnits: pending.reduce((a, p) => a + p.units, 0),
  };
}
