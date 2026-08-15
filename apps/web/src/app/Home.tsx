export function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
        Tu plan financiero
      </h1>
      <p className="mt-4 text-base leading-relaxed text-[var(--sea-ink-soft)]">
        Acá vas a ver el resumen de tu patrimonio, ingresos y proyecciones a medida que cargues tu información financiera.
      </p>
    </div>
  )
}
