import { useState, type ReactElement } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MonthPicker } from "@/components/ui/monthpicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMonthName } from "@/lib/format";

export function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  const name = formatMonthName(month).slice(0, 3);
  return `${name[0].toUpperCase()}${name.slice(1)} ${month.slice(0, 4)}`;
}

const ROUND =
  "relative flex h-10 items-center justify-center rounded-full text-foreground transition-colors after:absolute after:-inset-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none";

export function MonthPickerPopover({
  value,
  onValueChange,
  trigger,
}: {
  value: string;
  onValueChange: (month: string) => void;
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent className="w-auto p-0" align="center">
        <MonthPicker
          selectedMonth={new Date(`${value}-01T00:00:00`)}
          onMonthSelect={(date) => {
            onValueChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function MonthStepper({
  value,
  onValueChange,
  "aria-label": ariaLabel = "Mes",
}: {
  value: string;
  onValueChange: (month: string) => void;
  "aria-label"?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex shrink-0 items-center rounded-full border border-border bg-background p-0.5">
      <button type="button" aria-label="Mes anterior" className={`${ROUND} w-10`} onClick={() => onValueChange(shiftMonth(value, -1))}>
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <MonthPickerPopover
        value={value}
        onValueChange={onValueChange}
        trigger={
          <button type="button" className={`${ROUND} px-1.5 text-[15px] font-semibold whitespace-nowrap tabular-nums`}>
            {monthLabel(value)}
          </button>
        }
      />
      <button type="button" aria-label="Mes siguiente" className={`${ROUND} w-10`} onClick={() => onValueChange(shiftMonth(value, 1))}>
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
