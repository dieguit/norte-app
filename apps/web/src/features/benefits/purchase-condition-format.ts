import type { PurchaseCondition } from "@repo/shared-types";

export function purchaseConditionText(condition: PurchaseCondition): string {
  switch (condition.kind) {
    case "participating_locations":
      return `Locales adheridos: ${condition.instruction}`;
    case "acquirer":
      return `${condition.mode === "exclude" ? "No aplica con" : "Aplica con"} ${condition.names.join(", ")}.`;
    case "daily_time":
      return `Horario: ${condition.from} a ${condition.to} (hora de Argentina).`;
    case "coupon":
      return `Cupón${condition.code ? ` ${condition.code}` : ""}: ${condition.instruction}`;
    case "legal_purchase":
      return condition.text;
  }
}
