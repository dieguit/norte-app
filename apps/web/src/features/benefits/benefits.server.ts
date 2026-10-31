import "@tanstack/react-start/server-only";
import {
  BenefitBankListSchema,
  BenefitProfileSchema,
  BenefitSearchResultSchema,
  BenefitDetailSchema,
  type UpdateBenefitProfile,
  type BenefitSearchQuery,
} from "@repo/shared-types";
import {
  callFinancialApi,
  mutateFinancialApi,
  throwFinancialApiError,
} from "../financial/financial.server";

async function get(path: string) {
  const response = await callFinancialApi(path);
  if (!response.ok)
    await throwFinancialApiError(response, "No pudimos cargar los beneficios.");
  return response.json();
}

export async function getBenefitSettingsServer() {
  const [banks, profile] = await Promise.all([
    get("/benefits/banks"),
    get("/me/benefits/preferences"),
  ]);
  return {
    banks: BenefitBankListSchema.parse(banks).banks,
    profile: BenefitProfileSchema.parse(profile),
  };
}

export async function saveBenefitProfileServer({
  data,
}: {
  data: UpdateBenefitProfile;
}) {
  const response = await mutateFinancialApi(
    "/me/benefits/preferences",
    "PUT",
    data,
    "No pudimos guardar tus beneficios.",
  );
  return BenefitProfileSchema.parse(await response.json());
}

export async function setBenefitDigestEnabledServer({
  data,
}: {
  data: { enabled: boolean };
}): Promise<void> {
  await mutateFinancialApi(
    "/me/notifications/savings_digest",
    "PATCH",
    data,
    "No pudimos cambiar los avisos.",
  );
}

export async function searchBenefitsServer({
  data,
}: {
  data: BenefitSearchQuery;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data))
    if (value !== undefined) params.set(key, String(value));
  return BenefitSearchResultSchema.parse(
    await get(`/me/benefits/search?${params}`),
  );
}

export async function getBenefitServer({ data }: { data: { id: string } }) {
  return BenefitDetailSchema.parse(
    await get(`/me/benefits/campaigns/${encodeURIComponent(data.id)}`),
  );
}
