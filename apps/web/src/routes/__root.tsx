import { ClerkProvider } from "@clerk/tanstack-react-start";
import { HeadContent, Scripts, createRootRoute, useLocation } from "@tanstack/react-router";
import { esES } from "@clerk/localizations";
import { Toaster } from "sonner";
import { getLocale } from "#/paraglide/runtime";
import appCss from "../styles.css?url";
import { NotFoundPage } from "../components/ErrorPage";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  // Only the landing is translated; the app UI is Spanish regardless of the visitor's locale.
  const lang = pathname === "/" ? getLocale() : "es";

  return (
    <ClerkProvider localization={esES}>
      <html lang={lang}>
        <head>
          <HeadContent />
        </head>
        <body className="font-sans antialiased [overflow-wrap:anywhere]">
          {children}
          <Toaster richColors position="top-right" duration={2000} />
          {/* <TanStackDevtools */}
          {/*   config={{ position: "bottom-right" }} */}
          {/*   plugins={[ */}
          {/*     { */}
          {/*       name: "Tanstack Router", */}
          {/*       render: <TanStackRouterDevtoolsPanel />, */}
          {/*     }, */}
          {/*   ]} */}
          {/* /> */}
          <Scripts />
        </body>
      </html>
    </ClerkProvider>
  );
}
