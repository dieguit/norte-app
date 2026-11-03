import type { PurchaseCondition } from "@repo/shared-types";

export function purchaseConditionText(condition: PurchaseCondition): string {
  switch (condition.kind) {
    case "payroll":
      return `Requiere cobrar el sueldo en ${condition.bankSlug.charAt(0).toUpperCase()}${condition.bankSlug.slice(1)}.`;
    case "participating_locations":
      return `Locales adheridos: ${condition.instruction}`;
    case "acquirer":
      return `${condition.mode === "exclude" ? "No aplica con" : "Aplica con"} ${condition.names.join(", ")}.`;
    case "daily_time":
      return `Horario: ${condition.from} a ${condition.to} (hora de Argentina).`;
    case "coupon":
      return `Cupón${condition.code ? ` ${condition.code}` : ""}: ${condition.instruction}`;
  }
}
