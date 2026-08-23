import { ClerkProvider } from "@clerk/tanstack-react-start";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { esES } from "@clerk/localizations";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={esES}>
      <html lang="en">
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
