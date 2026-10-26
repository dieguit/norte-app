import { Link } from "@tanstack/react-router";
import { RotateCw } from "lucide-react";
import { AppBrand } from "./AppBrand";
import { Button, buttonVariants } from "./ui/button";

export function NotFoundPage() {
  return (
    <ErrorPage
      title="Página no encontrada"
      description="La página que buscás no existe o se movió."
      homeHref="/"
    />
  );
}

export function ErrorPage({
  title,
  description,
  homeHref,
  onRetry,
}: {
  title: string;
  description: string;
  homeHref: "/" | "/app";
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background md:bg-surface-sunken">
      <header className="flex h-20 items-center px-6">
        <AppBrand href={homeHref} />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-20">
        <div className="w-full md:w-[438px] md:rounded-lg md:border md:border-border md:bg-background md:p-12">
          <div className="mx-auto flex w-full max-w-[342px] flex-col items-center gap-7">
            <div className="flex w-full flex-col items-center gap-4 text-center">
              <img
                src="/images/error-duck.jpg"
                alt=""
                width={200}
                height={160}
                className="h-40 w-[200px] object-cover"
              />
              <h1 className="text-display text-[30px] font-medium tracking-[-0.6px] text-foreground">
                {title}
              </h1>
              <p className="whitespace-pre-line text-[15px] leading-[1.6] text-muted-foreground">
                {description}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              {onRetry && (
                <Button size="lg" className="w-full" onClick={onRetry}>
                  <RotateCw data-icon="inline-start" />
                  Volver a intentar
                </Button>
              )}
              <Link
                to={homeHref}
                className={buttonVariants({
                  variant: onRetry ? "ghost" : "default",
                  size: "lg",
                  className: "w-full",
                })}
              >
                Ir al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
