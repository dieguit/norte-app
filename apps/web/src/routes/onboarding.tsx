import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "./onboarding/-components/onboarding-page";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding | Norte" }] }),
  component: OnboardingPage,
});
