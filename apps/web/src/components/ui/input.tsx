import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "demo-input block w-full px-3.5 py-2.5 text-base border border-[var(--line)] rounded-xl bg-[color-mix(in_oklab,var(--surface-strong)_88%,white_12%)] text-[var(--sea-ink)] outline-none transition-all focus:border-[color-mix(in_oklab,var(--lagoon-deep)_58%,var(--line))] focus:ring-3 focus:ring-[color-mix(in_oklab,var(--lagoon)_24%,transparent)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
