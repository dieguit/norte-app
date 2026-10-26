// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorPage, NotFoundPage } from "./ErrorPage";

function renderInRouter(ui: ReactNode, path = "/") {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => ui }),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

afterEach(cleanup);

describe("ErrorPage", () => {
  it("404 links home to the landing and has no retry", async () => {
    renderInRouter(<NotFoundPage />);

    expect(await screen.findByRole("heading", { name: "Página no encontrada" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /volver a intentar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir al inicio/i })).toHaveAttribute("href", "/");
  });

  it.each([
    ["/app/nope", "/app"],
    ["/apple", "/"],
  ])("404 at %s links home to %s", async (path, href) => {
    renderInRouter(<NotFoundPage />, path);

    expect(await screen.findByRole("link", { name: /ir al inicio/i })).toHaveAttribute("href", href);
  });

  it("500 retries and links home to the given href", async () => {
    const onRetry = vi.fn();
    renderInRouter(
      <ErrorPage title="Algo salió mal" description="x" homeHref="/app" onRetry={onRetry} />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /volver a intentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: /ir al inicio/i })).toHaveAttribute("href", "/app");
  });
});
