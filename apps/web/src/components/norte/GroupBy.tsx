import { ChevronDown, Layers } from "lucide-react";

export type GroupByValue = "category" | "date";

const LABELS: Record<GroupByValue, string> = { category: "Categoría", date: "Fecha" };

export function GroupBy({ value, onValueChange }: { value: GroupByValue; onValueChange: (value: GroupByValue) => void }) {
  return (
    <div className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-body-sm has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring">
      <Layers className="size-3.5 text-muted-foreground" aria-hidden="true" />
      <span className="text-muted-foreground">Agrupar por</span>
      <span className="font-semibold text-foreground">{LABELS[value]}</span>
      <ChevronDown className="size-3.5 text-foreground" aria-hidden="true" />
      <select
        aria-label="Agrupar por"
        value={value}
        onChange={(event) => onValueChange(event.target.value as GroupByValue)}
        className="absolute -inset-1 cursor-pointer appearance-none opacity-0"
      >
        {Object.entries(LABELS).map(([option, label]) => (
          <option key={option} value={option}>{label}</option>
        ))}
      </select>
    </div>
  );
}
