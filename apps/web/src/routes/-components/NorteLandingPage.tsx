import { m } from '#/paraglide/messages'

export function NorteLandingPage() {
  const steps = [
    ['01', m.what_step1_title(), m.what_step1_body()],
    ['02', m.what_step2_title(), m.what_step2_body()],
    ['03', m.what_step3_title(), m.what_step3_body()],
  ]
  const features = [
    [m.feature_goals_title(), m.feature_goals_body()],
    [m.feature_impact_title(), m.feature_impact_body()],
    [m.feature_savings_title(), m.feature_savings_body()],
    [m.feature_finances_title(), m.feature_finances_body()],
  ]

  return (
    <main id="main">
      <section id="top" className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-16">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-[color-mix(in_oklab,var(--lagoon-deep)_25%,transparent)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lagoon-deep)]">
            {m.hero_badge()}
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">
            {m.hero_title()}
          </h1>
          <p className="mt-5 text-xl font-medium text-[var(--lagoon-deep)] sm:text-2xl">
            {m.hero_subtitle()}
          </p>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[color-mix(in_oklab,var(--sea-ink)_78%,transparent)]">
            {m.hero_body()}
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[color-mix(in_oklab,var(--sea-ink)_64%,transparent)]">
            {m.hero_note()}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="/app" className="rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-[var(--on-primary)]">
              {m.hero_cta_primary()}
            </a>
            <a href="#what" className="rounded-full border border-[color-mix(in_oklab,var(--sea-ink)_20%,transparent)] bg-[var(--surface)] px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-[var(--sea-ink)]">
              {m.hero_cta_secondary()}
            </a>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[2rem] bg-[color-mix(in_oklab,var(--on-primary)_30%,transparent)] p-2 shadow-[var(--shadow-card)] lg:max-w-none">
          <img
            src="/images/compass.jpg"
            alt={m.hero_image_alt()}
            className="h-[20rem] w-full rounded-[1.5rem] object-cover object-[35%_50%] sm:h-[28rem] lg:h-[34rem]"
            width="2048"
            height="1365"
            sizes="(min-width: 1024px) 48vw, (min-width: 640px) 560px, 100vw"
          />
        </div>
      </section>

      <section id="what" className="bg-[var(--sea-ink)] px-5 py-16 text-[var(--on-primary)] sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color-mix(in_oklab,var(--on-primary)_55%,transparent)]">
            {m.what_eyebrow()}
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
            {m.what_title()}
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map(([number, title, body]) => (
              <article key={title} className="rounded-3xl border border-[color-mix(in_oklab,var(--on-primary)_10%,transparent)] bg-[color-mix(in_oklab,var(--on-primary)_7%,transparent)] p-6">
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--lagoon)]">{number}</span>
                <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-[color-mix(in_oklab,var(--on-primary)_68%,transparent)]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--lagoon-deep)]">
              {m.features_eyebrow()}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
              {m.features_title()}
            </h2>
            <p className="mt-5 text-lg leading-8 text-[color-mix(in_oklab,var(--sea-ink)_68%,transparent)]">
              {m.features_body()}
            </p>
          </div>
          <div className="grid gap-4">
            {features.map(([title, body]) => (
              <article key={title} className="route-card relative overflow-hidden rounded-3xl border border-[color-mix(in_oklab,var(--lagoon-deep)_18%,transparent)] bg-[var(--surface)] p-6 pl-14 shadow-[var(--shadow-card)]">
                <span className="absolute left-5 top-7 size-4 rounded-full bg-[var(--lagoon-deep)] ring-8 ring-[color-mix(in_oklab,var(--lagoon-deep)_10%,transparent)]" />
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-2 leading-7 text-[color-mix(in_oklab,var(--sea-ink)_68%,transparent)]">{body}</p>
              </article>
            ))}
            <article className="relative overflow-hidden rounded-3xl border border-[color-mix(in_oklab,var(--sea-ink)_15%,transparent)] bg-[var(--sea-ink)] p-6 pl-14 text-[var(--on-primary)] shadow-[var(--shadow-card)]">
              <span className="absolute left-5 top-7 size-4 rounded-full bg-[var(--sand)] ring-8 ring-[color-mix(in_oklab,var(--on-primary)_10%,transparent)]" />
              <h3 className="text-xl font-semibold">{m.feature_whatsapp_title()}</h3>
              <p className="mt-2 leading-7 text-[color-mix(in_oklab,var(--on-primary)_68%,transparent)]">{m.feature_whatsapp_body()}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="start" className="px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="mx-auto grid max-w-6xl gap-10 overflow-hidden rounded-[2rem] bg-[var(--lagoon-deep)] p-8 text-[var(--on-primary)] shadow-[var(--shadow-card)] sm:p-12 lg:grid-cols-[1fr_0.8fr] lg:items-end lg:p-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color-mix(in_oklab,var(--on-primary)_60%,transparent)]">
              {m.start_eyebrow()}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
              {m.start_title()}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[color-mix(in_oklab,var(--on-primary)_72%,transparent)]">
              {m.start_body()}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <a href="/app" className="rounded-full bg-[var(--on-primary)] px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-[var(--lagoon-deep)]">
              {m.start_cta()}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
