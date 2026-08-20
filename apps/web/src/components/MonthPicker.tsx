import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatCalendarMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MonthPicker } from "./ui/monthpicker";

export interface MonthPickerInputProps {
  value?: string;
  onValueChange: (value: string) => void;
  minMonth?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

export function MonthPickerInput({
  value,
  onValueChange,
  minMonth,
  id,
  "aria-label": ariaLabel,
  className,
}: MonthPickerInputProps) {
  const [open, setOpen] = React.useState(false);

  const selectedMonth = value ? new Date(`${value}-01T00:00:00`) : undefined;
  const minDate = minMonth
    ? (() => {
        const d = new Date(`${minMonth}-01T00:00:00`);
        d.setMonth(d.getMonth() + 1);
        return d;
      })()
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            data-empty={!value}
            className={cn(
              "w-full justify-between text-left font-normal px-3.5 py-2.5 h-auto text-base rounded-xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--surface-strong)_88%,white_12%)] text-[var(--sea-ink)] hover:bg-[color-mix(in_oklab,var(--surface-strong)_88%,white_12%)] data-[empty=true]:text-muted-foreground focus-visible:border-[color-mix(in_oklab,var(--lagoon-deep)_58%,var(--line))] focus-visible:ring-3 focus-visible:ring-[color-mix(in_oklab,var(--lagoon)_24%,transparent)]",
              className
            )}
          >
            {value ? formatCalendarMonth(value) : <span>Seleccionar mes</span>}
            <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <MonthPicker
          selectedMonth={selectedMonth}
          minDate={minDate}
          onMonthSelect={(date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            onValueChange(`${year}-${month}`);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
