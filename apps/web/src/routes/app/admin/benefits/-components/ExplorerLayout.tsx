import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/norte/PageHeader";
import { Page } from "@/components/norte/PageLayout";

const TABS = [
  { to: "/app/admin/benefits", label: "Campañas", exact: true },
  { to: "/app/admin/benefits/runs", label: "Bancos y corridas", exact: false },
  { to: "/app/admin/benefits/brands", label: "Marcas", exact: false },
  { to: "/app/admin/benefits/mappings", label: "Categorías", exact: false },
] as const;

export function ExplorerLayout({
  showTabs,
  children,
}: {
  showTabs: boolean;
  children: ReactNode;
}) {
  return (
    <Page className="pb-12">
      {showTabs && (
        <>
          <PageHeader
            eyebrow="Administración"
            title="Beneficios"
            subtitle="Todo lo que traen las fuentes, tal como lo leímos."
          />
          <nav
            aria-label="Secciones del explorador"
            className="-mx-5 overflow-x-auto px-5 xl:mx-0 xl:px-0"
          >
            <ul className="m-0 flex min-w-max list-none gap-6 border-b border-border p-0">
              {TABS.map((tab) => (
                <li key={tab.to}>
                  <Link
                    to={tab.to}
                    activeOptions={{ exact: tab.exact, includeSearch: false }}
                    className="relative flex h-11 items-center text-[15px] font-medium text-foreground/60 no-underline transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none data-[status=active]:text-foreground data-[status=active]:after:absolute data-[status=active]:after:inset-x-0 data-[status=active]:after:-bottom-px data-[status=active]:after:h-0.5 data-[status=active]:after:bg-foreground"
                  >
                    {tab.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
      {children}
    </Page>
  );
}
