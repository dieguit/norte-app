import { cn } from "@/lib/utils";

export function MapGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[linear-gradient(var(--map-grid)_1px,transparent_1px),linear-gradient(90deg,var(--map-grid)_1px,transparent_1px)] bg-size-[24px_24px] [mask-image:linear-gradient(to_bottom,black_35%,transparent)]",
        className,
      )}
    />
  );
}
