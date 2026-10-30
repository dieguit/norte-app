import { createServerFn } from "@tanstack/react-start";
import {
  UpdateBenefitProfileSchema,
  BenefitSearchQuerySchema,
} from "@repo/shared-types";
import { z } from "zod";
import {
  getBenefitSettingsServer,
  saveBenefitProfileServer,
  setBenefitDigestEnabledServer,
  searchBenefitsServer,
  getBenefitServer,
} from "./benefits.server";

export const getBenefitSettings = createServerFn({ method: "GET" }).handler(
  getBenefitSettingsServer,
);
export const saveBenefitProfile = createServerFn({ method: "POST" })
  .validator((input: unknown) => UpdateBenefitProfileSchema.parse(input))
  .handler(saveBenefitProfileServer);
export const setBenefitDigestEnabled = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ enabled: z.boolean() }).parse(input),
  )
  .handler(setBenefitDigestEnabledServer);
export const searchBenefits = createServerFn({ method: "GET" })
  .validator((input: unknown) => BenefitSearchQuerySchema.parse(input))
  .handler(searchBenefitsServer);
export const getBenefit = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ id: z.uuid() }).parse(input))
  .handler(getBenefitServer);
