import type { z } from "zod";
import type {
  businessSchema,
  scenarioSchema,
  backupSchema,
  decisionSchema,
} from "../lib/validation";
import type { fullPlanSchema, saleSchema } from "../lib/validation/planning";
export type Business = z.infer<typeof businessSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type Backup = z.infer<typeof backupSchema>;
export type Plan = z.infer<typeof fullPlanSchema>;
export type Sale = z.infer<typeof saleSchema>;
export type Decision = z.infer<typeof decisionSchema>;
export interface Result {
  price: number;
  demand: number;
  capacity: number;
  dailyOrders: number;
  orders: number;
  revenue: number;
  variableCosts: number;
  employeeCosts: number;
  additionalCosts: number;
  fixedCosts: number;
  totalCosts: number;
  profit: number;
  contribution: number;
  margin: number;
  unserved: number;
  utilization: number;
  investment: number;
  stockLost: number;
  stockWaste: number;
  stockClosing: number;
  stockPurchases: number;
  stockPurchaseCost: number;
  commissionCosts: number;
  operatingDays: number;
  ingredientCost: number;
  wasteCosts: number;
}
