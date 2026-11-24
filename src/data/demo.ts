import type { Business, Scenario } from "../types";
import { defaultPlan } from "../lib/validation/planning";
export const demoBusiness: Business = {
  name: "Kopi Senja",
  category: "Kedai kopi & minuman",
  product: "Kopi susu / pesanan",
  price: 25000,
  cost: 10000,
  demand: 40,
  capacity: 50,
  days: 26,
  fixed: 9000000,
  salariesIncluded: true,
  demo: true,
};
export const baseline = (b: Business): Scenario => ({
  id: "baseline",
  name: "Kondisi awal",
  priceChange: 0,
  discount: 0,
  demandChange: 0,
  cost: b.cost,
  marketing: 0,
  employees: 0,
  salary: 3000000,
  addedCapacity: 20,
  updatedAt: new Date().toISOString(),
  plan: defaultPlan(),
});
export function preset(b: Business, type: number): Scenario {
  return {
    ...baseline(b),
    id: crypto.randomUUID(),
    name:
      ["Naikkan harga 10%", "Promosi akhir pekan", "Tambah satu barista"][
        type
      ] ?? "Skenario baru",
    ...(type === 0
      ? { priceChange: 10, demandChange: -5 }
      : type === 1
        ? { discount: 15, marketing: 500000, demandChange: 30 }
        : type === 2
          ? { employees: 1 }
          : {}),
  };
}
