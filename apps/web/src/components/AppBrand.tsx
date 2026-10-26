export function AppBrand({ href = "/app" }: { href?: string }) {
  return (
    <a
      href={href}
      aria-label="Norte"
      className="flex min-h-11 items-center gap-2.5 text-foreground no-underline hover:text-foreground"
    >
      <img
        src="/images/logo.png"
        alt=""
        className="size-8 rounded-xl object-contain shadow-[var(--shadow-card)]"
        width="32"
        height="32"
      />
      <span className="text-sm font-semibold tracking-[4px]">NORTE</span>
    </a>
  );
}
