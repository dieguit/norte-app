import { Plus } from "lucide-react";

export function FloatingAdd({
  onClick,
  "aria-label": ariaLabel,
}: {
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 h-20 bg-gradient-to-t from-background to-transparent backdrop-blur-[2px] md:bottom-0 md:left-[250px]">
      <div className="mx-auto flex h-full max-w-2xl justify-end px-5 pt-3.5">
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          className="pointer-events-auto flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <Plus className="size-6" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
