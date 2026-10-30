import type { ComponentProps, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function SidePanelContent({ className, ...props }: ComponentProps<typeof SheetContent>) {
  return (
    <SheetContent
      {...props}
      side="right"
      className={cn(
        "flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]",
        className,
      )}
    />
  );
}

export function SidePanelHeader({ title, description, eyebrow, onBack }: { title: ReactNode; description?: ReactNode; eyebrow?: string; onBack?: () => void }) {
  return (
    <SheetHeader className="flex-row items-start gap-3 border-b border-border px-6 py-5 pr-14">
      {onBack && (
        <button
          type="button"
          aria-label="Volver"
          onClick={onBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {eyebrow && <p className="m-0 text-overline text-muted-foreground">{eyebrow}</p>}
        <SheetTitle className="font-serif text-2xl font-bold text-foreground">{title}</SheetTitle>
        {description && <SheetDescription className="text-sm text-muted-foreground">{description}</SheetDescription>}
      </div>
    </SheetHeader>
  );
}
