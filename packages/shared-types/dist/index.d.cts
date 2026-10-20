import { z } from 'zod';
import { CurrencyCode, Money } from '@repo/finance-utils';

declare const PlaceholderStatusSchema: z.ZodEnum<{
    todo: "todo";
    "in-progress": "in-progress";
    done: "done";
}>;
type PlaceholderStatus = z.infer<typeof PlaceholderStatusSchema>;
declare const PlaceholderItemSchema: z.ZodObject<{
    id: z.ZodUUID;
    title: z.ZodString;
    description: z.ZodString;
    status: z.ZodEnum<{
        todo: "todo";
        "in-progress": "in-progress";
        done: "done";
    }>;
    createdAt: z.ZodISODateTime;
    updatedAt: z.ZodISODateTime;
}, z.core.$strip>;
type PlaceholderItem = z.infer<typeof PlaceholderItemSchema>;
declare const PlaceholderItemListSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodUUID;
    title: z.ZodString;
    description: z.ZodString;
    status: z.ZodEnum<{
        todo: "todo";
        "in-progress": "in-progress";
        done: "done";
    }>;
    createdAt: z.ZodISODateTime;
    updatedAt: z.ZodISODateTime;
}, z.core.$strip>>;
type PlaceholderItemList = z.infer<typeof PlaceholderItemListSchema>;
declare const CreatePlaceholderItemSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
type CreatePlaceholderItem = z.infer<typeof CreatePlaceholderItemSchema>;
declare const UpdatePlaceholderItemSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        todo: "todo";
        "in-progress": "in-progress";
        done: "done";
    }>>;
}, z.core.$strip>;
type UpdatePlaceholderItem = z.infer<typeof UpdatePlaceholderItemSchema>;
declare const DeletePlaceholderItemResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, z.core.$strip>;
type DeletePlaceholderItemResponse = z.infer<typeof DeletePlaceholderItemResponseSchema>;

declare const InitialHomeStateSchema: z.ZodObject<{
    income: z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strip>;
    expensesKnowledge: z.ZodEnum<{
        unknown: "unknown";
        known: "known";
    }>;
    expenses: z.ZodOptional<z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strip>>;
    plan: z.ZodObject<{
        fundingMethod: z.ZodEnum<{
            save: "save";
            invest: "invest";
        }>;
        destinationCurrency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        monthlyCommitment: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strip>;
        destinationAmount: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strip>;
        effectiveMonth: z.ZodString;
        allocationPercentage: z.ZodString;
    }, z.core.$strip>;
    goal: z.ZodObject<{
        type: z.ZodString;
        name: z.ZodString;
        targetAmount: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strip>>;
        currentAmount: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strip>;
        emergencyFundMonths: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    previousMonthShortfalls: z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            saving: "saving";
            investment: "investment";
        }>;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        amount: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const ProfileResponseSchema: z.ZodObject<{
    profile: z.ZodEnum<{
        missing: "missing";
        present: "present";
    }>;
    home: z.ZodOptional<z.ZodObject<{
        income: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strip>;
        expensesKnowledge: z.ZodEnum<{
            unknown: "unknown";
            known: "known";
        }>;
        expenses: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strip>>;
        plan: z.ZodObject<{
            fundingMethod: z.ZodEnum<{
                save: "save";
                invest: "invest";
            }>;
            destinationCurrency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            monthlyCommitment: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strip>;
            destinationAmount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strip>;
            effectiveMonth: z.ZodString;
            allocationPercentage: z.ZodString;
        }, z.core.$strip>;
        goal: z.ZodObject<{
            type: z.ZodString;
            name: z.ZodString;
            targetAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strip>>;
            currentAmount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strip>;
            emergencyFundMonths: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>;
        previousMonthShortfalls: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            amount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type InitialHomeState = z.infer<typeof InitialHomeStateSchema>;
type ProfileResponse = {
    profile: "missing";
} | {
    profile: "present";
    home: InitialHomeState;
};

declare const FIXED_INCOME_SOURCES: {
    readonly salary: "Sueldo";
    readonly independent: "Trabajo independiente";
    readonly pension: "Jubilación o pensión";
    readonly rent: "Alquileres";
    readonly investments: "Inversiones";
    readonly family_support: "Ayuda familiar";
    readonly uncategorized: "Sin categoría";
    readonly asset_sale: "Venta de bienes / usados";
    readonly bonus: "Bono / aguinaldo / premio";
    readonly occasional_work: "Trabajo ocasional";
    readonly gift_inheritance: "Regalo / herencia";
    readonly refund: "Reintegro / devolución";
    readonly extraordinary_income: "Rescate o cobro extraordinario";
};
declare const IncomeDraftSchema: z.ZodObject<{
    concept: z.ZodPipe<z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
    source: z.ZodUnion<readonly [z.ZodObject<{
        kind: z.ZodEnum<{
            salary: "salary";
            independent: "independent";
            pension: "pension";
            rent: "rent";
            investments: "investments";
            family_support: "family_support";
            uncategorized: "uncategorized";
            asset_sale: "asset_sale";
            bonus: "bonus";
            occasional_work: "occasional_work";
            gift_inheritance: "gift_inheritance";
            refund: "refund";
            extraordinary_income: "extraordinary_income";
        }>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"custom">;
        sourceId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"custom">;
        name: z.ZodString;
    }, z.core.$strip>]>;
    amount: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    recurring: z.ZodBoolean;
    effectiveMonth: z.ZodString;
}, z.core.$strip>;
declare const IncomeMutationResponseSchema: z.ZodObject<{
    userId: z.ZodString;
    effectiveMonth: z.ZodString;
    createdAt: z.ZodISODateTime;
    updatedAt: z.ZodISODateTime;
    id: z.ZodString;
    sourceKind: z.ZodString;
    sourceId: z.ZodNullable<z.ZodString>;
    concept: z.ZodNullable<z.ZodString>;
    amount: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    recurring: z.ZodBoolean;
}, z.core.$strip>;
type IncomeDraft = z.output<typeof IncomeDraftSchema>;

declare const ExpenseDraftSchema: z.ZodObject<{
    concept: z.ZodPipe<z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
    source: z.ZodUnion<readonly [z.ZodObject<{
        kind: z.ZodEnum<{
            family_support: "family_support";
            uncategorized: "uncategorized";
            housing: "housing";
            school: "school";
            health: "health";
            loans: "loans";
            utilities: "utilities";
            insurance: "insurance";
            subscriptions: "subscriptions";
            clothing: "clothing";
            gift: "gift";
            family_help: "family_help";
            occasional_health: "occasional_health";
            maintenance: "maintenance";
            travel_leisure: "travel_leisure";
            technology: "technology";
            taxes_fees: "taxes_fees";
        }>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"custom">;
        sourceId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"custom">;
        name: z.ZodString;
    }, z.core.$strip>]>;
    amount: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    recurring: z.ZodBoolean;
}, z.core.$strip>;
declare const ExpenseMutationResponseSchema: z.ZodObject<{
    effectiveMonth: z.ZodISODate;
    endMonth: z.ZodNullable<z.ZodISODate>;
    id: z.ZodString;
    sourceKind: z.ZodString;
    sourceId: z.ZodNullable<z.ZodString>;
    concept: z.ZodNullable<z.ZodString>;
    amount: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    recurring: z.ZodBoolean;
}, z.core.$strip>;
type ExpenseDraft = z.output<typeof ExpenseDraftSchema>;

declare const CreateSavingsPlaceSchema: z.ZodObject<{
    name: z.ZodString;
}, z.core.$strip>;
declare const RenameSavingsPlaceSchema: z.ZodObject<{
    name: z.ZodString;
}, z.core.$strip>;
declare const SavingsPlaceIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
declare const SavingsTransferSchema: z.ZodObject<{
    fromPlaceId: z.ZodString;
    toPlaceId: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    amount: z.ZodString;
}, z.core.$strip>;
declare const SavingsPlaceMutationResponseSchema: z.ZodObject<{
    placeId: z.ZodString;
}, z.core.$strip>;
declare const SavingsTransferResponseSchema: z.ZodObject<{
    transferId: z.ZodString;
}, z.core.$strip>;

interface UsdPurchaseInput {
    usdAmount?: string | null;
    arsSpent?: string | null;
    effectiveRate?: string | null;
}
interface UsdPurchaseDerivation {
    usdAmount?: string;
    arsSpent?: string;
    effectiveRate?: string;
}
declare function deriveUsdPurchase(input: UsdPurchaseInput): UsdPurchaseDerivation;

declare const SavingContributionDraftWireSchema: z.ZodObject<{
    kind: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        saving: "saving";
        investment: "investment";
    }>>>;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    amount: z.ZodString;
    place: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"existing">;
        placeId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"new">;
        name: z.ZodString;
    }, z.core.$strict>], "kind">>;
    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>;
declare const ConfirmSavingContributionWireSchema: z.ZodObject<{
    draft: z.ZodObject<{
        kind: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            saving: "saving";
            investment: "investment";
        }>>>;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        amount: z.ZodString;
        place: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"existing">;
            placeId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"new">;
            name: z.ZodString;
        }, z.core.$strict>], "kind">>;
        arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>;
    previewToken: z.ZodString;
    catchUpMonth: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
declare const UpdateSavingContributionWireSchema: z.ZodObject<{
    draft: z.ZodObject<{
        kind: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            saving: "saving";
            investment: "investment";
        }>>>;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        amount: z.ZodString;
        place: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"existing">;
            placeId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"new">;
            name: z.ZodString;
        }, z.core.$strict>], "kind">>;
        arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const ContributionIdPathWireSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strict>;
declare const SavingContributionContextSchema: z.ZodObject<{
    currentMonth: z.ZodString;
    eligibleGoals: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        percentage: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    }, z.core.$strict>>;
    eligibleGoalsUsd: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        percentage: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    }, z.core.$strict>>;
    eligibleInvestmentGoals: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        percentage: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    }, z.core.$strict>>>;
    eligibleInvestmentGoalsUsd: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        percentage: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    }, z.core.$strict>>>;
    monthlyTargetArs: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>>>;
    monthlyTargetUsd: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>>>;
    monthlyInvestmentTargetArs: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>>>;
    monthlyInvestmentTargetUsd: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>>>;
    places: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, z.core.$strict>>;
    investmentState: z.ZodObject<{
        ars: z.ZodDiscriminatedUnion<[z.ZodObject<{
            status: z.ZodLiteral<"ready">;
        }, z.core.$strict>, z.ZodObject<{
            status: z.ZodLiteral<"incomplete">;
            reason: z.ZodLiteral<"missing_investment_position">;
        }, z.core.$strict>], "status">;
        usd: z.ZodDiscriminatedUnion<[z.ZodObject<{
            status: z.ZodLiteral<"ready">;
        }, z.core.$strict>, z.ZodObject<{
            status: z.ZodLiteral<"incomplete">;
            reason: z.ZodLiteral<"missing_investment_position">;
        }, z.core.$strict>], "status">;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const SavingContributionContextMissingSchema: z.ZodObject<{
    profile: z.ZodLiteral<"missing">;
}, z.core.$strict>;
declare const SavingContributionContextPresentSchema: z.ZodObject<{
    profile: z.ZodLiteral<"present">;
    context: z.ZodObject<{
        currentMonth: z.ZodString;
        eligibleGoals: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            percentage: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        }, z.core.$strict>>;
        eligibleGoalsUsd: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            percentage: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        }, z.core.$strict>>;
        eligibleInvestmentGoals: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            percentage: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        }, z.core.$strict>>>;
        eligibleInvestmentGoalsUsd: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            percentage: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        }, z.core.$strict>>>;
        monthlyTargetArs: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>>;
        monthlyTargetUsd: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>>;
        monthlyInvestmentTargetArs: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>>;
        monthlyInvestmentTargetUsd: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>>;
        places: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, z.core.$strict>>;
        investmentState: z.ZodObject<{
            ars: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"ready">;
            }, z.core.$strict>, z.ZodObject<{
                status: z.ZodLiteral<"incomplete">;
                reason: z.ZodLiteral<"missing_investment_position">;
            }, z.core.$strict>], "status">;
            usd: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"ready">;
            }, z.core.$strict>, z.ZodObject<{
                status: z.ZodLiteral<"incomplete">;
                reason: z.ZodLiteral<"missing_investment_position">;
            }, z.core.$strict>], "status">;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const SavingContributionContextStateSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    profile: z.ZodLiteral<"missing">;
}, z.core.$strict>, z.ZodObject<{
    profile: z.ZodLiteral<"present">;
    context: z.ZodObject<{
        currentMonth: z.ZodString;
        eligibleGoals: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            percentage: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        }, z.core.$strict>>;
        eligibleGoalsUsd: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            percentage: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        }, z.core.$strict>>;
        eligibleInvestmentGoals: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            percentage: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        }, z.core.$strict>>>;
        eligibleInvestmentGoalsUsd: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            percentage: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        }, z.core.$strict>>>;
        monthlyTargetArs: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>>;
        monthlyTargetUsd: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>>;
        monthlyInvestmentTargetArs: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>>;
        monthlyInvestmentTargetUsd: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>>;
        places: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, z.core.$strict>>;
        investmentState: z.ZodObject<{
            ars: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"ready">;
            }, z.core.$strict>, z.ZodObject<{
                status: z.ZodLiteral<"incomplete">;
                reason: z.ZodLiteral<"missing_investment_position">;
            }, z.core.$strict>], "status">;
            usd: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"ready">;
            }, z.core.$strict>, z.ZodObject<{
                status: z.ZodLiteral<"incomplete">;
                reason: z.ZodLiteral<"missing_investment_position">;
            }, z.core.$strict>], "status">;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strict>], "profile">;
declare const SavingContributionEditPreviewSchema: z.ZodObject<{
    preview: z.ZodObject<{
        draft: z.ZodObject<{
            kind: z.ZodOptional<z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>>;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            amount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            place: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"existing">;
                placeId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"new">;
                name: z.ZodString;
            }, z.core.$strict>], "kind">>;
            arsSpent: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            effectiveRate: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            goalName: z.ZodString;
            percentage: z.ZodString;
            amount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            progressBefore: z.ZodOptional<z.ZodString>;
            progressAfter: z.ZodOptional<z.ZodString>;
            projectionBefore: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">>;
            projectionAfter: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const SavingContributionPreviewSchema: z.ZodObject<{
    preview: z.ZodObject<{
        draft: z.ZodObject<{
            kind: z.ZodOptional<z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>>;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            amount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            place: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"existing">;
                placeId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"new">;
                name: z.ZodString;
            }, z.core.$strict>], "kind">>;
            arsSpent: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            effectiveRate: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            goalName: z.ZodString;
            percentage: z.ZodString;
            amount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            progressBefore: z.ZodOptional<z.ZodString>;
            progressAfter: z.ZodOptional<z.ZodString>;
            projectionBefore: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">>;
            projectionAfter: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    previewToken: z.ZodString;
}, z.core.$strict>;
declare const SavingContributionCreatedSchema: z.ZodObject<{
    status: z.ZodLiteral<"created">;
    contributionId: z.ZodString;
}, z.core.$strict>;
declare const SavingContributionStaleSchema: z.ZodObject<{
    status: z.ZodLiteral<"stale">;
    preview: z.ZodObject<{
        preview: z.ZodObject<{
            draft: z.ZodObject<{
                kind: z.ZodOptional<z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>>;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                amount: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                place: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    kind: z.ZodLiteral<"existing">;
                    placeId: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    kind: z.ZodLiteral<"new">;
                    name: z.ZodString;
                }, z.core.$strict>], "kind">>;
                arsSpent: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveRate: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                percentage: z.ZodString;
                amount: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                progressBefore: z.ZodOptional<z.ZodString>;
                progressAfter: z.ZodOptional<z.ZodString>;
                projectionBefore: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">>;
                projectionAfter: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">>;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        previewToken: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const SavingContributionConfirmationSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    status: z.ZodLiteral<"created">;
    contributionId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<"stale">;
    preview: z.ZodObject<{
        preview: z.ZodObject<{
            draft: z.ZodObject<{
                kind: z.ZodOptional<z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>>;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                amount: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                place: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    kind: z.ZodLiteral<"existing">;
                    placeId: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    kind: z.ZodLiteral<"new">;
                    name: z.ZodString;
                }, z.core.$strict>], "kind">>;
                arsSpent: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveRate: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                percentage: z.ZodString;
                amount: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                progressBefore: z.ZodOptional<z.ZodString>;
                progressAfter: z.ZodOptional<z.ZodString>;
                projectionBefore: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">>;
                projectionAfter: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">>;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        previewToken: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>], "status">;
declare const SavingContributionUpdatedSchema: z.ZodObject<{
    status: z.ZodLiteral<"updated">;
}, z.core.$strict>;
declare const SavingContributionDeletedSchema: z.ZodObject<{
    status: z.ZodLiteral<"deleted">;
}, z.core.$strict>;
type SavingContributionDraftWire = z.input<typeof SavingContributionDraftWireSchema>;
type ConfirmSavingContributionWire = z.input<typeof ConfirmSavingContributionWireSchema>;
type UpdateSavingContributionWire = z.input<typeof UpdateSavingContributionWireSchema>;
type SavingContributionContext = z.infer<typeof SavingContributionContextSchema>;
type SavingContributionContextState = z.infer<typeof SavingContributionContextStateSchema>;
type SavingContributionPreview = z.infer<typeof SavingContributionPreviewSchema>;
type SavingContributionEditPreview = z.infer<typeof SavingContributionEditPreviewSchema>;
type SavingContributionConfirmation = z.infer<typeof SavingContributionConfirmationSchema>;

declare const FinancesWorkspaceSchema: z.ZodObject<{
    goalDedicationPercentage: z.ZodString;
    month: z.ZodString;
    summary: z.ZodObject<{
        income: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodLiteral<"ARS">;
        }, z.core.$strip>;
        expenses: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodLiteral<"ARS">;
        }, z.core.$strip>;
        balance: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodLiteral<"ARS">;
        }, z.core.$strip>;
        contribution: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodLiteral<"ARS">;
        }, z.core.$strip>;
    }, z.core.$strip>;
    incomes: z.ZodObject<{
        sources: z.ZodArray<z.ZodObject<{
            id: z.ZodUUID;
            name: z.ZodString;
            normalizedName: z.ZodString;
        }, z.core.$strip>>;
        incomes: z.ZodArray<z.ZodObject<{
            id: z.ZodUUID;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodUUID>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodISODate;
            arsEquivalent: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    expenses: z.ZodObject<{
        sources: z.ZodArray<z.ZodObject<{
            id: z.ZodUUID;
            name: z.ZodString;
            normalizedName: z.ZodString;
        }, z.core.$strip>>;
        expenses: z.ZodArray<z.ZodObject<{
            id: z.ZodUUID;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodUUID>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodISODate;
            arsEquivalent: z.ZodNullable<z.ZodString>;
            endMonth: z.ZodNullable<z.ZodISODate>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    savings: z.ZodObject<{
        places: z.ZodArray<z.ZodObject<{
            id: z.ZodUUID;
            name: z.ZodString;
            balances: z.ZodObject<{
                ARS: z.ZodString;
                USD: z.ZodString;
            }, z.core.$strip>;
            hasMovements: z.ZodBoolean;
        }, z.core.$strip>>;
        movements: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"contribution">;
            id: z.ZodUUID;
            placeId: z.ZodUUID;
            placeName: z.ZodString;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            createdAt: z.ZodISODateTime;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"completion">;
            id: z.ZodUUID;
            goalId: z.ZodUUID;
            goalName: z.ZodString;
            placeId: z.ZodUUID;
            placeName: z.ZodString;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            createdAt: z.ZodISODateTime;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"transfer">;
            id: z.ZodUUID;
            fromPlaceId: z.ZodUUID;
            fromPlaceName: z.ZodString;
            toPlaceId: z.ZodUUID;
            toPlaceName: z.ZodString;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            createdAt: z.ZodISODateTime;
        }, z.core.$strip>], "kind">>;
    }, z.core.$strip>;
}, z.core.$strip>;
type FinancesWorkspace = z.infer<typeof FinancesWorkspaceSchema>;
declare function isExpenseIncludedInMonth(expense: {
    recurring: boolean;
    effectiveMonth: string;
    endMonth?: string | null;
}, month: string): boolean;
declare function isIncomeIncludedInMonth(income: {
    recurring: boolean;
    effectiveMonth: string;
}, month: string): boolean;

declare const FinancialOnboardingSchema: z.ZodObject<{
    goal: z.ZodObject<{
        type: z.ZodEnum<{
            emergency_fund: "emergency_fund";
            purchase: "purchase";
            retirement: "retirement";
            other: "other";
        }>;
        targetAmount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        desiredMonth: z.ZodString;
        priority: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        strategy: z.ZodEnum<{
            save: "save";
            invest: "invest";
        }>;
        annualReturnRate: z.ZodString;
        availability: z.ZodEnum<{
            available_now: "available_now";
            available_from: "available_from";
            long_term: "long_term";
        }>;
        availableFromMonth: z.ZodString;
        name: z.ZodString;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    incomes: z.ZodArray<z.ZodObject<{
        concept: z.ZodPipe<z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        source: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodEnum<{
                salary: "salary";
                independent: "independent";
                pension: "pension";
                rent: "rent";
                investments: "investments";
                family_support: "family_support";
                uncategorized: "uncategorized";
                asset_sale: "asset_sale";
                bonus: "bonus";
                occasional_work: "occasional_work";
                gift_inheritance: "gift_inheritance";
                refund: "refund";
                extraordinary_income: "extraordinary_income";
            }>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"custom">;
            sourceId: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"custom">;
            name: z.ZodString;
        }, z.core.$strip>]>;
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        recurring: z.ZodBoolean;
        effectiveMonth: z.ZodString;
    }, z.core.$strip>>;
    expenses: z.ZodArray<z.ZodObject<{
        concept: z.ZodPipe<z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        source: z.ZodUnion<readonly [z.ZodObject<{
            kind: z.ZodEnum<{
                family_support: "family_support";
                uncategorized: "uncategorized";
                housing: "housing";
                school: "school";
                health: "health";
                loans: "loans";
                utilities: "utilities";
                insurance: "insurance";
                subscriptions: "subscriptions";
                clothing: "clothing";
                gift: "gift";
                family_help: "family_help";
                occasional_health: "occasional_health";
                maintenance: "maintenance";
                travel_leisure: "travel_leisure";
                technology: "technology";
                taxes_fees: "taxes_fees";
            }>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"custom">;
            sourceId: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"custom">;
            name: z.ZodString;
        }, z.core.$strip>]>;
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        recurring: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strict>;
declare const FinancialOnboardingResponseSchema: z.ZodObject<{
    created: z.ZodBoolean;
}, z.core.$strict>;
type FinancialOnboardingInput = z.infer<typeof FinancialOnboardingSchema>;

declare const ContributionSummarySchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodEnum<{
        saving: "saving";
        investment: "investment";
    }>;
    userId: z.ZodOptional<z.ZodString>;
    amount: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    placeId: z.ZodOptional<z.ZodString>;
    placeName: z.ZodOptional<z.ZodString>;
    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodISODateTime;
    allocations: z.ZodArray<z.ZodObject<{
        goalId: z.ZodString;
        goalName: z.ZodString;
        amount: z.ZodString;
        percentage: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const GoalWorkspaceItemSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    priority: z.ZodEnum<{
        high: "high";
        medium: "medium";
        low: "low";
    }>;
    strategy: z.ZodEnum<{
        save: "save";
        invest: "invest";
    }>;
    status: z.ZodEnum<{
        active: "active";
        paused: "paused";
        completed: "completed";
    }>;
    createdAt: z.ZodISODateTime;
    desiredDate: z.ZodOptional<z.ZodISODate>;
    completedAt: z.ZodOptional<z.ZodISODateTime>;
    targetAmount: z.ZodOptional<z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>>;
    savingsValue: z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>;
    investmentValue: z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>;
    actualValue: z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>;
    progressPercentage: z.ZodOptional<z.ZodString>;
    funding: z.ZodArray<z.ZodObject<{
        percentage: z.ZodString;
        monthlyContribution: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        effectiveMonth: z.ZodISODate;
    }, z.core.$strict>>;
    projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
        status: z.ZodLiteral<"available">;
        completionMonth: z.ZodString;
    }, z.core.$strict>, ...z.ZodObject<{
        status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
    }, z.core.$strict>[]], "status">;
    desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
    annualReturnRate: z.ZodOptional<z.ZodString>;
    availability: z.ZodOptional<z.ZodEnum<{
        available_now: "available_now";
        available_from: "available_from";
        long_term: "long_term";
    }>>;
    availableFrom: z.ZodOptional<z.ZodISODate>;
    usesPlanningRate: z.ZodBoolean;
    completionEligible: z.ZodBoolean;
    completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        placeId: z.ZodString;
        placeName: z.ZodString;
        amount: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        createdAt: z.ZodISODateTime;
    }, z.core.$strict>>>;
    contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<{
            saving: "saving";
            investment: "investment";
        }>;
        userId: z.ZodOptional<z.ZodString>;
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        placeId: z.ZodOptional<z.ZodString>;
        placeName: z.ZodOptional<z.ZodString>;
        arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodISODateTime;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            goalName: z.ZodString;
            amount: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>>;
    savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<{
            saving: "saving";
            investment: "investment";
        }>;
        userId: z.ZodOptional<z.ZodString>;
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        placeId: z.ZodOptional<z.ZodString>;
        placeName: z.ZodOptional<z.ZodString>;
        arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodISODateTime;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            goalName: z.ZodString;
            amount: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
declare const WorkspaceSchema: z.ZodObject<{
    financialSummary: z.ZodObject<{
        month: z.ZodString;
        income: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        expenses: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        balance: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        dedicationPercentage: z.ZodString;
        contribution: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
    }, z.core.$strict>;
    groups: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<{
            active: "active";
            paused: "paused";
            completed: "completed";
        }>;
        goals: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            priority: z.ZodEnum<{
                high: "high";
                medium: "medium";
                low: "low";
            }>;
            strategy: z.ZodEnum<{
                save: "save";
                invest: "invest";
            }>;
            status: z.ZodEnum<{
                active: "active";
                paused: "paused";
                completed: "completed";
            }>;
            createdAt: z.ZodISODateTime;
            desiredDate: z.ZodOptional<z.ZodISODate>;
            completedAt: z.ZodOptional<z.ZodISODateTime>;
            targetAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            savingsValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            investmentValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            actualValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            progressPercentage: z.ZodOptional<z.ZodString>;
            funding: z.ZodArray<z.ZodObject<{
                percentage: z.ZodString;
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodISODate;
            }, z.core.$strict>>;
            projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
            desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
            annualReturnRate: z.ZodOptional<z.ZodString>;
            availability: z.ZodOptional<z.ZodEnum<{
                available_now: "available_now";
                available_from: "available_from";
                long_term: "long_term";
            }>>;
            availableFrom: z.ZodOptional<z.ZodISODate>;
            usesPlanningRate: z.ZodBoolean;
            completionEligible: z.ZodBoolean;
            completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                placeId: z.ZodString;
                placeName: z.ZodString;
                amount: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                createdAt: z.ZodISODateTime;
            }, z.core.$strict>>>;
            contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const GoalCreationDraftWireSchema: z.ZodObject<{
    type: z.ZodEnum<{
        emergency_fund: "emergency_fund";
        purchase: "purchase";
        retirement: "retirement";
        other: "other";
    }>;
    name: z.ZodString;
    targetAmount: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    desiredMonth: z.ZodString;
    priority: z.ZodEnum<{
        high: "high";
        medium: "medium";
        low: "low";
    }>;
    strategy: z.ZodEnum<{
        save: "save";
        invest: "invest";
    }>;
    annualReturnRate: z.ZodString;
    availability: z.ZodEnum<{
        available_now: "available_now";
        available_from: "available_from";
        long_term: "long_term";
    }>;
    availableFromMonth: z.ZodString;
    allocations: z.ZodArray<z.ZodObject<{
        goalId: z.ZodString;
        percentage: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const ConfirmGoalCreationWireSchema: z.ZodObject<{
    draft: z.ZodObject<{
        type: z.ZodEnum<{
            emergency_fund: "emergency_fund";
            purchase: "purchase";
            retirement: "retirement";
            other: "other";
        }>;
        name: z.ZodString;
        targetAmount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        desiredMonth: z.ZodString;
        priority: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        strategy: z.ZodEnum<{
            save: "save";
            invest: "invest";
        }>;
        annualReturnRate: z.ZodString;
        availability: z.ZodEnum<{
            available_now: "available_now";
            available_from: "available_from";
            long_term: "long_term";
        }>;
        availableFromMonth: z.ZodString;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    previewToken: z.ZodString;
}, z.core.$strict>;
declare const GoalCreationContextWireSchema: z.ZodObject<{
    currentMonth: z.ZodString;
    expensesKnowledge: z.ZodEnum<{
        unknown: "unknown";
        known: "known";
    }>;
    hasEmergencyFund: z.ZodBoolean;
    plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>>;
    currentAllocation: z.ZodOptional<z.ZodObject<{
        effectiveMonth: z.ZodString;
        entries: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const GoalCreationContextMissingSchema: z.ZodObject<{
    profile: z.ZodLiteral<"missing">;
}, z.core.$strict>;
declare const GoalCreationContextPresentSchema: z.ZodObject<{
    profile: z.ZodLiteral<"present">;
    context: z.ZodObject<{
        currentMonth: z.ZodString;
        expensesKnowledge: z.ZodEnum<{
            unknown: "unknown";
            known: "known";
        }>;
        hasEmergencyFund: z.ZodBoolean;
        plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        currentAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const GoalCreationContextStateSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    profile: z.ZodLiteral<"missing">;
}, z.core.$strict>, z.ZodObject<{
    profile: z.ZodLiteral<"present">;
    context: z.ZodObject<{
        currentMonth: z.ZodString;
        expensesKnowledge: z.ZodEnum<{
            unknown: "unknown";
            known: "known";
        }>;
        hasEmergencyFund: z.ZodBoolean;
        plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        currentAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>], "profile">;
declare const GoalCreationPreviewSchema: z.ZodObject<{
    proposal: z.ZodObject<{
        normalizedGoal: z.ZodObject<{
            name: z.ZodString;
            type: z.ZodEnum<{
                emergency_fund: "emergency_fund";
                purchase: "purchase";
                retirement: "retirement";
                other: "other";
            }>;
            targetAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            priority: z.ZodEnum<{
                high: "high";
                medium: "medium";
                low: "low";
            }>;
            strategy: z.ZodEnum<{
                save: "save";
                invest: "invest";
            }>;
            desiredDate: z.ZodOptional<z.ZodISODate>;
            emergencyFundMonths: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>;
        investment: z.ZodOptional<z.ZodObject<{
            annualReturnRate: z.ZodString;
            availability: z.ZodEnum<{
                available_now: "available_now";
                available_from: "available_from";
                long_term: "long_term";
            }>;
            availableFrom: z.ZodOptional<z.ZodISODate>;
        }, z.core.$strict>>;
        allocation: z.ZodObject<{
            monthlyContribution: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                percentage: z.ZodString;
                allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                pending: z.ZodBoolean;
            }, z.core.$strict>>;
            totalPercentage: z.ZodString;
        }, z.core.$strict>;
        impacts: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            goalName: z.ZodString;
            before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"not_created">;
            }, z.core.$strict>, z.ZodObject<{
                status: z.ZodLiteral<"existing">;
                projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
                allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
            }, z.core.$strict>], "status">;
            after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
        }, z.core.$strict>>;
        proposedSource: z.ZodObject<{
            profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                userId: z.ZodString;
                baseCurrency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                expensesKnowledge: z.ZodString;
                plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                onboardingCompleted: z.ZodBoolean;
            }, z.core.$strict>>>;
            goals: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                name: z.ZodString;
                type: z.ZodString;
                targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
                desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                createdAt: z.ZodString;
            }, z.core.$strict>>;
            savingsPositions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                goalId: z.ZodString;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            investmentPositions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                goalId: z.ZodString;
                currentValue: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>>>;
                availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            snapshots: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveMonth: z.ZodString;
            }, z.core.$strict>>;
            allocations: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                snapshotId: z.ZodString;
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
            contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodNullable<z.ZodString>;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
            }, z.core.$strict>>>;
            expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodNullable<z.ZodString>;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>>;
            completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                goalId: z.ZodString;
                placeId: z.ZodString;
                placeName: z.ZodString;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                createdAt: z.ZodString;
            }, z.core.$strict>>>;
        }, z.core.$strict>;
    }, z.core.$strict>;
    previewToken: z.ZodString;
}, z.core.$strict>;
declare const GoalCreationCreatedSchema: z.ZodObject<{
    status: z.ZodLiteral<"created">;
    goalId: z.ZodString;
}, z.core.$strict>;
declare const GoalCreationStaleSchema: z.ZodObject<{
    status: z.ZodLiteral<"stale">;
    preview: z.ZodObject<{
        proposal: z.ZodObject<{
            normalizedGoal: z.ZodObject<{
                name: z.ZodString;
                type: z.ZodEnum<{
                    emergency_fund: "emergency_fund";
                    purchase: "purchase";
                    retirement: "retirement";
                    other: "other";
                }>;
                targetAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                desiredDate: z.ZodOptional<z.ZodISODate>;
                emergencyFundMonths: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>;
            investment: z.ZodOptional<z.ZodObject<{
                annualReturnRate: z.ZodString;
                availability: z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>;
                availableFrom: z.ZodOptional<z.ZodISODate>;
            }, z.core.$strict>>;
            allocation: z.ZodObject<{
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    percentage: z.ZodString;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    pending: z.ZodBoolean;
                }, z.core.$strict>>;
                totalPercentage: z.ZodString;
            }, z.core.$strict>;
            impacts: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"not_created">;
                }, z.core.$strict>, z.ZodObject<{
                    status: z.ZodLiteral<"existing">;
                    projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                        status: z.ZodLiteral<"available">;
                        completionMonth: z.ZodString;
                    }, z.core.$strict>, ...z.ZodObject<{
                        status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                    }, z.core.$strict>[]], "status">;
                    allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                }, z.core.$strict>], "status">;
                after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
            }, z.core.$strict>>;
            proposedSource: z.ZodObject<{
                profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    userId: z.ZodString;
                    baseCurrency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    expensesKnowledge: z.ZodString;
                    plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                    onboardingCompleted: z.ZodBoolean;
                }, z.core.$strict>>>;
                goals: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    name: z.ZodString;
                    type: z.ZodString;
                    targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    priority: z.ZodEnum<{
                        high: "high";
                        medium: "medium";
                        low: "low";
                    }>;
                    strategy: z.ZodEnum<{
                        save: "save";
                        invest: "invest";
                    }>;
                    status: z.ZodEnum<{
                        active: "active";
                        paused: "paused";
                        completed: "completed";
                    }>;
                    desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>;
                savingsPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                investmentPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    currentValue: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                        available_now: "available_now";
                        available_from: "available_from";
                        long_term: "long_term";
                    }>>>;
                    availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                snapshots: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>;
                allocations: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    snapshotId: z.ZodString;
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>>;
                expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                    endMonth: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>>>;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        previewToken: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const GoalCreationConfirmationSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    status: z.ZodLiteral<"created">;
    goalId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<"stale">;
    preview: z.ZodObject<{
        proposal: z.ZodObject<{
            normalizedGoal: z.ZodObject<{
                name: z.ZodString;
                type: z.ZodEnum<{
                    emergency_fund: "emergency_fund";
                    purchase: "purchase";
                    retirement: "retirement";
                    other: "other";
                }>;
                targetAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                desiredDate: z.ZodOptional<z.ZodISODate>;
                emergencyFundMonths: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>;
            investment: z.ZodOptional<z.ZodObject<{
                annualReturnRate: z.ZodString;
                availability: z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>;
                availableFrom: z.ZodOptional<z.ZodISODate>;
            }, z.core.$strict>>;
            allocation: z.ZodObject<{
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    percentage: z.ZodString;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    pending: z.ZodBoolean;
                }, z.core.$strict>>;
                totalPercentage: z.ZodString;
            }, z.core.$strict>;
            impacts: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"not_created">;
                }, z.core.$strict>, z.ZodObject<{
                    status: z.ZodLiteral<"existing">;
                    projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                        status: z.ZodLiteral<"available">;
                        completionMonth: z.ZodString;
                    }, z.core.$strict>, ...z.ZodObject<{
                        status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                    }, z.core.$strict>[]], "status">;
                    allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                }, z.core.$strict>], "status">;
                after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
            }, z.core.$strict>>;
            proposedSource: z.ZodObject<{
                profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    userId: z.ZodString;
                    baseCurrency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    expensesKnowledge: z.ZodString;
                    plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                    onboardingCompleted: z.ZodBoolean;
                }, z.core.$strict>>>;
                goals: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    name: z.ZodString;
                    type: z.ZodString;
                    targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    priority: z.ZodEnum<{
                        high: "high";
                        medium: "medium";
                        low: "low";
                    }>;
                    strategy: z.ZodEnum<{
                        save: "save";
                        invest: "invest";
                    }>;
                    status: z.ZodEnum<{
                        active: "active";
                        paused: "paused";
                        completed: "completed";
                    }>;
                    desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>;
                savingsPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                investmentPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    currentValue: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                        available_now: "available_now";
                        available_from: "available_from";
                        long_term: "long_term";
                    }>>>;
                    availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                snapshots: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>;
                allocations: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    snapshotId: z.ZodString;
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>>;
                expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                    endMonth: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>>>;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        previewToken: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>], "status">;
declare const AllocationChangeDraftWireSchema: z.ZodObject<{
    dedicationPercentage: z.ZodNumber;
    allocations: z.ZodArray<z.ZodObject<{
        goalId: z.ZodString;
        percentage: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const ConfirmAllocationChangeWireSchema: z.ZodObject<{
    draft: z.ZodObject<{
        dedicationPercentage: z.ZodNumber;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    previewToken: z.ZodString;
}, z.core.$strict>;
declare const AllocationChangePreviewSchema: z.ZodObject<{
    proposal: z.ZodObject<{
        dedicationPercentage: z.ZodNumber;
        allocation: z.ZodObject<{
            monthlyContribution: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                percentage: z.ZodString;
                allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                pending: z.ZodBoolean;
            }, z.core.$strict>>;
            totalPercentage: z.ZodString;
        }, z.core.$strict>;
        impacts: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            goalName: z.ZodString;
            before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"not_created">;
            }, z.core.$strict>, z.ZodObject<{
                status: z.ZodLiteral<"existing">;
                projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
                allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
            }, z.core.$strict>], "status">;
            after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
        }, z.core.$strict>>;
        proposedSource: z.ZodObject<{
            profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                userId: z.ZodString;
                baseCurrency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                expensesKnowledge: z.ZodString;
                plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                onboardingCompleted: z.ZodBoolean;
            }, z.core.$strict>>>;
            goals: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                name: z.ZodString;
                type: z.ZodString;
                targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
                desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                createdAt: z.ZodString;
            }, z.core.$strict>>;
            savingsPositions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                goalId: z.ZodString;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            investmentPositions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                goalId: z.ZodString;
                currentValue: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>>>;
                availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            snapshots: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveMonth: z.ZodString;
            }, z.core.$strict>>;
            allocations: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                snapshotId: z.ZodString;
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
            contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodNullable<z.ZodString>;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
            }, z.core.$strict>>>;
            expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodNullable<z.ZodString>;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>>;
            completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                goalId: z.ZodString;
                placeId: z.ZodString;
                placeName: z.ZodString;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                createdAt: z.ZodString;
            }, z.core.$strict>>>;
        }, z.core.$strict>;
    }, z.core.$strict>;
    previewToken: z.ZodString;
}, z.core.$strict>;
declare const AllocationChangeUpdatedSchema: z.ZodObject<{
    status: z.ZodLiteral<"updated">;
}, z.core.$strict>;
declare const AllocationChangeStaleSchema: z.ZodObject<{
    status: z.ZodLiteral<"stale">;
    preview: z.ZodObject<{
        proposal: z.ZodObject<{
            dedicationPercentage: z.ZodNumber;
            allocation: z.ZodObject<{
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    percentage: z.ZodString;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    pending: z.ZodBoolean;
                }, z.core.$strict>>;
                totalPercentage: z.ZodString;
            }, z.core.$strict>;
            impacts: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"not_created">;
                }, z.core.$strict>, z.ZodObject<{
                    status: z.ZodLiteral<"existing">;
                    projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                        status: z.ZodLiteral<"available">;
                        completionMonth: z.ZodString;
                    }, z.core.$strict>, ...z.ZodObject<{
                        status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                    }, z.core.$strict>[]], "status">;
                    allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                }, z.core.$strict>], "status">;
                after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
            }, z.core.$strict>>;
            proposedSource: z.ZodObject<{
                profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    userId: z.ZodString;
                    baseCurrency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    expensesKnowledge: z.ZodString;
                    plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                    onboardingCompleted: z.ZodBoolean;
                }, z.core.$strict>>>;
                goals: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    name: z.ZodString;
                    type: z.ZodString;
                    targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    priority: z.ZodEnum<{
                        high: "high";
                        medium: "medium";
                        low: "low";
                    }>;
                    strategy: z.ZodEnum<{
                        save: "save";
                        invest: "invest";
                    }>;
                    status: z.ZodEnum<{
                        active: "active";
                        paused: "paused";
                        completed: "completed";
                    }>;
                    desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>;
                savingsPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                investmentPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    currentValue: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                        available_now: "available_now";
                        available_from: "available_from";
                        long_term: "long_term";
                    }>>>;
                    availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                snapshots: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>;
                allocations: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    snapshotId: z.ZodString;
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>>;
                expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                    endMonth: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>>>;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        previewToken: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const AllocationChangeConfirmationSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    status: z.ZodLiteral<"updated">;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<"stale">;
    preview: z.ZodObject<{
        proposal: z.ZodObject<{
            dedicationPercentage: z.ZodNumber;
            allocation: z.ZodObject<{
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    percentage: z.ZodString;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    pending: z.ZodBoolean;
                }, z.core.$strict>>;
                totalPercentage: z.ZodString;
            }, z.core.$strict>;
            impacts: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"not_created">;
                }, z.core.$strict>, z.ZodObject<{
                    status: z.ZodLiteral<"existing">;
                    projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                        status: z.ZodLiteral<"available">;
                        completionMonth: z.ZodString;
                    }, z.core.$strict>, ...z.ZodObject<{
                        status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                    }, z.core.$strict>[]], "status">;
                    allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                }, z.core.$strict>], "status">;
                after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
            }, z.core.$strict>>;
            proposedSource: z.ZodObject<{
                profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    userId: z.ZodString;
                    baseCurrency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    expensesKnowledge: z.ZodString;
                    plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                    onboardingCompleted: z.ZodBoolean;
                }, z.core.$strict>>>;
                goals: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    name: z.ZodString;
                    type: z.ZodString;
                    targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    priority: z.ZodEnum<{
                        high: "high";
                        medium: "medium";
                        low: "low";
                    }>;
                    strategy: z.ZodEnum<{
                        save: "save";
                        invest: "invest";
                    }>;
                    status: z.ZodEnum<{
                        active: "active";
                        paused: "paused";
                        completed: "completed";
                    }>;
                    desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>;
                savingsPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                investmentPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    currentValue: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                        available_now: "available_now";
                        available_from: "available_from";
                        long_term: "long_term";
                    }>>>;
                    availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                snapshots: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>;
                allocations: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    snapshotId: z.ZodString;
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>>;
                expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                    endMonth: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>>>;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        previewToken: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>], "status">;
declare const AllocationChangeContextSchema: z.ZodObject<{
    currentMonth: z.ZodString;
    financialSummary: z.ZodObject<{
        month: z.ZodString;
        income: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        expenses: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        balance: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        dedicationPercentage: z.ZodString;
        contribution: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
    }, z.core.$strict>;
    plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>>;
    activeGoals: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
            status: z.ZodLiteral<"available">;
            completionMonth: z.ZodString;
        }, z.core.$strict>, ...z.ZodObject<{
            status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
        }, z.core.$strict>[]], "status">;
    }, z.core.$strict>>;
    currentAllocation: z.ZodOptional<z.ZodObject<{
        effectiveMonth: z.ZodString;
        entries: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    pendingAllocation: z.ZodOptional<z.ZodObject<{
        effectiveMonth: z.ZodString;
        entries: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const AllocationChangeContextStateSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    profile: z.ZodLiteral<"missing">;
}, z.core.$strict>, z.ZodObject<{
    profile: z.ZodLiteral<"present">;
    context: z.ZodObject<{
        currentMonth: z.ZodString;
        financialSummary: z.ZodObject<{
            month: z.ZodString;
            income: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            expenses: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            balance: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            dedicationPercentage: z.ZodString;
            contribution: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        activeGoals: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
        }, z.core.$strict>>;
        currentAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        pendingAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>], "profile">;
declare const GoalLifecycleActionSchema: z.ZodEnum<{
    pause: "pause";
    resume: "resume";
}>;
declare const GoalLifecycleContextSchema: z.ZodObject<{
    plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>>;
    activeGoals: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>>;
    currentAllocation: z.ZodOptional<z.ZodObject<{
        effectiveMonth: z.ZodString;
        entries: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    pendingAllocation: z.ZodOptional<z.ZodObject<{
        effectiveMonth: z.ZodString;
        entries: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    goalId: z.ZodString;
    lifecycle: z.ZodEnum<{
        pause: "pause";
        resume: "resume";
    }>;
    goalName: z.ZodString;
    goalCurrency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    currentMonth: z.ZodString;
}, z.core.$strict>;
declare const GoalLifecyclePreviewWireSchema: z.ZodObject<{
    lifecycle: z.ZodEnum<{
        pause: "pause";
        resume: "resume";
    }>;
    allocations: z.ZodOptional<z.ZodArray<z.ZodObject<{
        goalId: z.ZodString;
        percentage: z.ZodString;
    }, z.core.$strict>>>;
}, z.core.$strict>;
declare const ConfirmGoalLifecycleWireSchema: z.ZodObject<{
    lifecycle: z.ZodEnum<{
        pause: "pause";
        resume: "resume";
    }>;
    allocations: z.ZodArray<z.ZodObject<{
        goalId: z.ZodString;
        percentage: z.ZodString;
    }, z.core.$strict>>;
    previewToken: z.ZodString;
}, z.core.$strict>;
declare const GoalLifecyclePreviewSchema: z.ZodObject<{
    proposal: z.ZodObject<{
        lifecycle: z.ZodEnum<{
            pause: "pause";
            resume: "resume";
        }>;
        goalId: z.ZodString;
        nextStatus: z.ZodEnum<{
            active: "active";
            paused: "paused";
            completed: "completed";
        }>;
        transition: z.ZodObject<{
            goalId: z.ZodString;
            status: z.ZodEnum<{
                active: "active";
                paused: "paused";
                completed: "completed";
            }>;
        }, z.core.$strict>;
        pauseMonthlyCommitment: z.ZodBoolean;
        allocation: z.ZodObject<{
            monthlyContribution: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                percentage: z.ZodString;
                allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                pending: z.ZodBoolean;
            }, z.core.$strict>>;
            totalPercentage: z.ZodString;
        }, z.core.$strict>;
        persistedAllocation: z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        impacts: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            goalName: z.ZodString;
            before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"not_created">;
            }, z.core.$strict>, z.ZodObject<{
                status: z.ZodLiteral<"existing">;
                projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
                allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
            }, z.core.$strict>], "status">;
            after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
        }, z.core.$strict>>;
        proposedSource: z.ZodObject<{
            profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                userId: z.ZodString;
                baseCurrency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                expensesKnowledge: z.ZodString;
                plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                onboardingCompleted: z.ZodBoolean;
            }, z.core.$strict>>>;
            goals: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                name: z.ZodString;
                type: z.ZodString;
                targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
                desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                createdAt: z.ZodString;
            }, z.core.$strict>>;
            savingsPositions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                goalId: z.ZodString;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            investmentPositions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                goalId: z.ZodString;
                currentValue: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>>>;
                availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            snapshots: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveMonth: z.ZodString;
            }, z.core.$strict>>;
            allocations: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                snapshotId: z.ZodString;
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
            contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodNullable<z.ZodString>;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
            }, z.core.$strict>>>;
            expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodNullable<z.ZodString>;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>>;
            completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                goalId: z.ZodString;
                placeId: z.ZodString;
                placeName: z.ZodString;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                createdAt: z.ZodString;
            }, z.core.$strict>>>;
        }, z.core.$strict>;
    }, z.core.$strict>;
    previewToken: z.ZodString;
}, z.core.$strict>;
declare const GoalLifecycleUpdatedSchema: z.ZodObject<{
    status: z.ZodLiteral<"updated">;
}, z.core.$strict>;
declare const GoalLifecycleStaleSchema: z.ZodObject<{
    status: z.ZodLiteral<"stale">;
    preview: z.ZodObject<{
        proposal: z.ZodObject<{
            lifecycle: z.ZodEnum<{
                pause: "pause";
                resume: "resume";
            }>;
            goalId: z.ZodString;
            nextStatus: z.ZodEnum<{
                active: "active";
                paused: "paused";
                completed: "completed";
            }>;
            transition: z.ZodObject<{
                goalId: z.ZodString;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
            }, z.core.$strict>;
            pauseMonthlyCommitment: z.ZodBoolean;
            allocation: z.ZodObject<{
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    percentage: z.ZodString;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    pending: z.ZodBoolean;
                }, z.core.$strict>>;
                totalPercentage: z.ZodString;
            }, z.core.$strict>;
            persistedAllocation: z.ZodObject<{
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>;
            impacts: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"not_created">;
                }, z.core.$strict>, z.ZodObject<{
                    status: z.ZodLiteral<"existing">;
                    projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                        status: z.ZodLiteral<"available">;
                        completionMonth: z.ZodString;
                    }, z.core.$strict>, ...z.ZodObject<{
                        status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                    }, z.core.$strict>[]], "status">;
                    allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                }, z.core.$strict>], "status">;
                after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
            }, z.core.$strict>>;
            proposedSource: z.ZodObject<{
                profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    userId: z.ZodString;
                    baseCurrency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    expensesKnowledge: z.ZodString;
                    plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                    onboardingCompleted: z.ZodBoolean;
                }, z.core.$strict>>>;
                goals: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    name: z.ZodString;
                    type: z.ZodString;
                    targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    priority: z.ZodEnum<{
                        high: "high";
                        medium: "medium";
                        low: "low";
                    }>;
                    strategy: z.ZodEnum<{
                        save: "save";
                        invest: "invest";
                    }>;
                    status: z.ZodEnum<{
                        active: "active";
                        paused: "paused";
                        completed: "completed";
                    }>;
                    desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>;
                savingsPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                investmentPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    currentValue: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                        available_now: "available_now";
                        available_from: "available_from";
                        long_term: "long_term";
                    }>>>;
                    availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                snapshots: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>;
                allocations: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    snapshotId: z.ZodString;
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>>;
                expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                    endMonth: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>>>;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        previewToken: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const GoalLifecycleConfirmationSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    status: z.ZodLiteral<"updated">;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<"stale">;
    preview: z.ZodObject<{
        proposal: z.ZodObject<{
            lifecycle: z.ZodEnum<{
                pause: "pause";
                resume: "resume";
            }>;
            goalId: z.ZodString;
            nextStatus: z.ZodEnum<{
                active: "active";
                paused: "paused";
                completed: "completed";
            }>;
            transition: z.ZodObject<{
                goalId: z.ZodString;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
            }, z.core.$strict>;
            pauseMonthlyCommitment: z.ZodBoolean;
            allocation: z.ZodObject<{
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    percentage: z.ZodString;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    pending: z.ZodBoolean;
                }, z.core.$strict>>;
                totalPercentage: z.ZodString;
            }, z.core.$strict>;
            persistedAllocation: z.ZodObject<{
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>;
            impacts: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"not_created">;
                }, z.core.$strict>, z.ZodObject<{
                    status: z.ZodLiteral<"existing">;
                    projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                        status: z.ZodLiteral<"available">;
                        completionMonth: z.ZodString;
                    }, z.core.$strict>, ...z.ZodObject<{
                        status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                    }, z.core.$strict>[]], "status">;
                    allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                }, z.core.$strict>], "status">;
                after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
            }, z.core.$strict>>;
            proposedSource: z.ZodObject<{
                profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    userId: z.ZodString;
                    baseCurrency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    expensesKnowledge: z.ZodString;
                    plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                    onboardingCompleted: z.ZodBoolean;
                }, z.core.$strict>>>;
                goals: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    name: z.ZodString;
                    type: z.ZodString;
                    targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    priority: z.ZodEnum<{
                        high: "high";
                        medium: "medium";
                        low: "low";
                    }>;
                    strategy: z.ZodEnum<{
                        save: "save";
                        invest: "invest";
                    }>;
                    status: z.ZodEnum<{
                        active: "active";
                        paused: "paused";
                        completed: "completed";
                    }>;
                    desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>;
                savingsPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                investmentPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    currentValue: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                        available_now: "available_now";
                        available_from: "available_from";
                        long_term: "long_term";
                    }>>>;
                    availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                snapshots: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>;
                allocations: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    snapshotId: z.ZodString;
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>>;
                expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                    endMonth: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>>>;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        previewToken: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>], "status">;
declare const GoalCompletionContextSchema: z.ZodObject<{
    plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>>;
    activeGoals: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>>;
    currentAllocation: z.ZodOptional<z.ZodObject<{
        effectiveMonth: z.ZodString;
        entries: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    pendingAllocation: z.ZodOptional<z.ZodObject<{
        effectiveMonth: z.ZodString;
        entries: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    goalId: z.ZodString;
    goalName: z.ZodString;
    targetAmount: z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>;
    savingsValue: z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
    }, z.core.$strict>;
    currentMonth: z.ZodString;
    savingsPlaces: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        balance: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const GoalCompletionContextPresentSchema: z.ZodObject<{
    profile: z.ZodLiteral<"present">;
    context: z.ZodObject<{
        plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        activeGoals: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        currentAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        pendingAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        goalId: z.ZodString;
        goalName: z.ZodString;
        targetAmount: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        savingsValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        currentMonth: z.ZodString;
        savingsPlaces: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            balance: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const GoalCompletionContextStateSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    profile: z.ZodLiteral<"missing">;
}, z.core.$strict>, z.ZodObject<{
    profile: z.ZodLiteral<"present">;
    context: z.ZodObject<{
        plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        activeGoals: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        currentAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        pendingAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        goalId: z.ZodString;
        goalName: z.ZodString;
        targetAmount: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        savingsValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        currentMonth: z.ZodString;
        savingsPlaces: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            balance: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>], "profile">;
declare const GoalCompletionPreviewWireSchema: z.ZodObject<{
    withdrawals: z.ZodArray<z.ZodObject<{
        placeId: z.ZodString;
        amount: z.ZodString;
    }, z.core.$strict>>;
    allocations: z.ZodArray<z.ZodObject<{
        goalId: z.ZodString;
        percentage: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const ConfirmGoalCompletionWireSchema: z.ZodObject<{
    withdrawals: z.ZodArray<z.ZodObject<{
        placeId: z.ZodString;
        amount: z.ZodString;
    }, z.core.$strict>>;
    allocations: z.ZodArray<z.ZodObject<{
        goalId: z.ZodString;
        percentage: z.ZodString;
    }, z.core.$strict>>;
    previewToken: z.ZodString;
}, z.core.$strict>;
declare const GoalCompletionPreviewSchema: z.ZodObject<{
    proposal: z.ZodObject<{
        goalId: z.ZodString;
        goalName: z.ZodString;
        targetAmount: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        withdrawals: z.ZodArray<z.ZodObject<{
            placeId: z.ZodString;
            placeName: z.ZodString;
            amount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        allocation: z.ZodObject<{
            monthlyContribution: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                percentage: z.ZodString;
                allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                pending: z.ZodBoolean;
            }, z.core.$strict>>;
            totalPercentage: z.ZodString;
        }, z.core.$strict>;
        persistedAllocation: z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        pauseMonthlyCommitment: z.ZodBoolean;
        impacts: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            goalName: z.ZodString;
            before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"not_created">;
            }, z.core.$strict>, z.ZodObject<{
                status: z.ZodLiteral<"existing">;
                projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
                allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
            }, z.core.$strict>], "status">;
            after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
        }, z.core.$strict>>;
        proposedSource: z.ZodObject<{
            profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                userId: z.ZodString;
                baseCurrency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                expensesKnowledge: z.ZodString;
                plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                onboardingCompleted: z.ZodBoolean;
            }, z.core.$strict>>>;
            goals: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                name: z.ZodString;
                type: z.ZodString;
                targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
                desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                createdAt: z.ZodString;
            }, z.core.$strict>>;
            savingsPositions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                goalId: z.ZodString;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            investmentPositions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                goalId: z.ZodString;
                currentValue: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>>>;
                availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            snapshots: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveMonth: z.ZodString;
            }, z.core.$strict>>;
            allocations: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                snapshotId: z.ZodString;
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
            contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodNullable<z.ZodString>;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
            }, z.core.$strict>>>;
            expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodNullable<z.ZodString>;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>>;
            completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                goalId: z.ZodString;
                placeId: z.ZodString;
                placeName: z.ZodString;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                createdAt: z.ZodString;
            }, z.core.$strict>>>;
        }, z.core.$strict>;
    }, z.core.$strict>;
    previewToken: z.ZodString;
}, z.core.$strict>;
declare const GoalCompletionCompletedSchema: z.ZodObject<{
    status: z.ZodLiteral<"completed">;
    completedAt: z.ZodISODateTime;
}, z.core.$strict>;
declare const GoalCompletionStaleSchema: z.ZodObject<{
    status: z.ZodLiteral<"stale">;
    preview: z.ZodObject<{
        proposal: z.ZodObject<{
            goalId: z.ZodString;
            goalName: z.ZodString;
            targetAmount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            withdrawals: z.ZodArray<z.ZodObject<{
                placeId: z.ZodString;
                placeName: z.ZodString;
                amount: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
            }, z.core.$strict>>;
            allocation: z.ZodObject<{
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    percentage: z.ZodString;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    pending: z.ZodBoolean;
                }, z.core.$strict>>;
                totalPercentage: z.ZodString;
            }, z.core.$strict>;
            persistedAllocation: z.ZodObject<{
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>;
            pauseMonthlyCommitment: z.ZodBoolean;
            impacts: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"not_created">;
                }, z.core.$strict>, z.ZodObject<{
                    status: z.ZodLiteral<"existing">;
                    projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                        status: z.ZodLiteral<"available">;
                        completionMonth: z.ZodString;
                    }, z.core.$strict>, ...z.ZodObject<{
                        status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                    }, z.core.$strict>[]], "status">;
                    allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                }, z.core.$strict>], "status">;
                after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
            }, z.core.$strict>>;
            proposedSource: z.ZodObject<{
                profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    userId: z.ZodString;
                    baseCurrency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    expensesKnowledge: z.ZodString;
                    plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                    onboardingCompleted: z.ZodBoolean;
                }, z.core.$strict>>>;
                goals: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    name: z.ZodString;
                    type: z.ZodString;
                    targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    priority: z.ZodEnum<{
                        high: "high";
                        medium: "medium";
                        low: "low";
                    }>;
                    strategy: z.ZodEnum<{
                        save: "save";
                        invest: "invest";
                    }>;
                    status: z.ZodEnum<{
                        active: "active";
                        paused: "paused";
                        completed: "completed";
                    }>;
                    desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>;
                savingsPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                investmentPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    currentValue: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                        available_now: "available_now";
                        available_from: "available_from";
                        long_term: "long_term";
                    }>>>;
                    availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                snapshots: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>;
                allocations: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    snapshotId: z.ZodString;
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>>;
                expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                    endMonth: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>>>;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        previewToken: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const GoalCompletionInvalidSchema: z.ZodObject<{
    status: z.ZodLiteral<"invalid">;
    message: z.ZodString;
}, z.core.$strict>;
declare const GoalCompletionConfirmationSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    status: z.ZodLiteral<"completed">;
    completedAt: z.ZodISODateTime;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<"stale">;
    preview: z.ZodObject<{
        proposal: z.ZodObject<{
            goalId: z.ZodString;
            goalName: z.ZodString;
            targetAmount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            withdrawals: z.ZodArray<z.ZodObject<{
                placeId: z.ZodString;
                placeName: z.ZodString;
                amount: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
            }, z.core.$strict>>;
            allocation: z.ZodObject<{
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    percentage: z.ZodString;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    pending: z.ZodBoolean;
                }, z.core.$strict>>;
                totalPercentage: z.ZodString;
            }, z.core.$strict>;
            persistedAllocation: z.ZodObject<{
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>;
            pauseMonthlyCommitment: z.ZodBoolean;
            impacts: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"not_created">;
                }, z.core.$strict>, z.ZodObject<{
                    status: z.ZodLiteral<"existing">;
                    projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                        status: z.ZodLiteral<"available">;
                        completionMonth: z.ZodString;
                    }, z.core.$strict>, ...z.ZodObject<{
                        status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                    }, z.core.$strict>[]], "status">;
                    allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                }, z.core.$strict>], "status">;
                after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
            }, z.core.$strict>>;
            proposedSource: z.ZodObject<{
                profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    userId: z.ZodString;
                    baseCurrency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    expensesKnowledge: z.ZodString;
                    plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                    onboardingCompleted: z.ZodBoolean;
                }, z.core.$strict>>>;
                goals: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    name: z.ZodString;
                    type: z.ZodString;
                    targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    priority: z.ZodEnum<{
                        high: "high";
                        medium: "medium";
                        low: "low";
                    }>;
                    strategy: z.ZodEnum<{
                        save: "save";
                        invest: "invest";
                    }>;
                    status: z.ZodEnum<{
                        active: "active";
                        paused: "paused";
                        completed: "completed";
                    }>;
                    desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>;
                savingsPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                investmentPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    currentValue: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                        available_now: "available_now";
                        available_from: "available_from";
                        long_term: "long_term";
                    }>>>;
                    availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                snapshots: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>;
                allocations: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    snapshotId: z.ZodString;
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>>;
                expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                    endMonth: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>>>;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        previewToken: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<"invalid">;
    message: z.ZodString;
}, z.core.$strict>], "status">;
declare const GoalPlanQueryWireSchema: z.ZodObject<{
    goalId: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodEnum<{
        pause: "pause";
        resume: "resume";
    }>>;
}, z.core.$strip>;
declare const GoalIdPathWireSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strict>;
declare const GoalPlanEditContextWireSchema: z.ZodObject<{
    goalId: z.ZodString;
    status: z.ZodEnum<{
        active: "active";
        paused: "paused";
    }>;
    draft: z.ZodObject<{
        type: z.ZodEnum<{
            emergency_fund: "emergency_fund";
            purchase: "purchase";
            retirement: "retirement";
            other: "other";
        }>;
        name: z.ZodString;
        targetAmount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        desiredMonth: z.ZodString;
        priority: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        strategy: z.ZodEnum<{
            save: "save";
            invest: "invest";
        }>;
        annualReturnRate: z.ZodString;
        availability: z.ZodEnum<{
            available_now: "available_now";
            available_from: "available_from";
            long_term: "long_term";
        }>;
        availableFromMonth: z.ZodString;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const GoalPlanContextPresentSchema: z.ZodObject<{
    profile: z.ZodLiteral<"present">;
    context: z.ZodObject<{
        currentMonth: z.ZodString;
        expensesKnowledge: z.ZodEnum<{
            unknown: "unknown";
            known: "known";
        }>;
        hasEmergencyFund: z.ZodBoolean;
        plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        currentAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    editContext: z.ZodOptional<z.ZodObject<{
        goalId: z.ZodString;
        status: z.ZodEnum<{
            active: "active";
            paused: "paused";
        }>;
        draft: z.ZodObject<{
            type: z.ZodEnum<{
                emergency_fund: "emergency_fund";
                purchase: "purchase";
                retirement: "retirement";
                other: "other";
            }>;
            name: z.ZodString;
            targetAmount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            desiredMonth: z.ZodString;
            priority: z.ZodEnum<{
                high: "high";
                medium: "medium";
                low: "low";
            }>;
            strategy: z.ZodEnum<{
                save: "save";
                invest: "invest";
            }>;
            annualReturnRate: z.ZodString;
            availability: z.ZodEnum<{
                available_now: "available_now";
                available_from: "available_from";
                long_term: "long_term";
            }>;
            availableFromMonth: z.ZodString;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
    }, z.core.$strict>>;
    allocationContext: z.ZodOptional<z.ZodObject<{
        currentMonth: z.ZodString;
        financialSummary: z.ZodObject<{
            month: z.ZodString;
            income: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            expenses: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            balance: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            dedicationPercentage: z.ZodString;
            contribution: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        activeGoals: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
        }, z.core.$strict>>;
        currentAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        pendingAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    lifecycleContext: z.ZodOptional<z.ZodObject<{
        plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        activeGoals: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        currentAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        pendingAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        goalId: z.ZodString;
        lifecycle: z.ZodEnum<{
            pause: "pause";
            resume: "resume";
        }>;
        goalName: z.ZodString;
        goalCurrency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        currentMonth: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const GoalPlanContextStateSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    profile: z.ZodLiteral<"missing">;
}, z.core.$strict>, z.ZodObject<{
    profile: z.ZodLiteral<"present">;
    context: z.ZodObject<{
        currentMonth: z.ZodString;
        expensesKnowledge: z.ZodEnum<{
            unknown: "unknown";
            known: "known";
        }>;
        hasEmergencyFund: z.ZodBoolean;
        plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        currentAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    editContext: z.ZodOptional<z.ZodObject<{
        goalId: z.ZodString;
        status: z.ZodEnum<{
            active: "active";
            paused: "paused";
        }>;
        draft: z.ZodObject<{
            type: z.ZodEnum<{
                emergency_fund: "emergency_fund";
                purchase: "purchase";
                retirement: "retirement";
                other: "other";
            }>;
            name: z.ZodString;
            targetAmount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            desiredMonth: z.ZodString;
            priority: z.ZodEnum<{
                high: "high";
                medium: "medium";
                low: "low";
            }>;
            strategy: z.ZodEnum<{
                save: "save";
                invest: "invest";
            }>;
            annualReturnRate: z.ZodString;
            availability: z.ZodEnum<{
                available_now: "available_now";
                available_from: "available_from";
                long_term: "long_term";
            }>;
            availableFromMonth: z.ZodString;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
    }, z.core.$strict>>;
    allocationContext: z.ZodOptional<z.ZodObject<{
        currentMonth: z.ZodString;
        financialSummary: z.ZodObject<{
            month: z.ZodString;
            income: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            expenses: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            balance: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            dedicationPercentage: z.ZodString;
            contribution: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        activeGoals: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
        }, z.core.$strict>>;
        currentAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        pendingAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    lifecycleContext: z.ZodOptional<z.ZodObject<{
        plannedMonthlyContribution: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        activeGoals: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        currentAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        pendingAllocation: z.ZodOptional<z.ZodObject<{
            effectiveMonth: z.ZodString;
            entries: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        goalId: z.ZodString;
        lifecycle: z.ZodEnum<{
            pause: "pause";
            resume: "resume";
        }>;
        goalName: z.ZodString;
        goalCurrency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        currentMonth: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>], "profile">;
declare const GoalEditConfirmWireSchema: z.ZodObject<{
    draft: z.ZodObject<{
        type: z.ZodEnum<{
            emergency_fund: "emergency_fund";
            purchase: "purchase";
            retirement: "retirement";
            other: "other";
        }>;
        name: z.ZodString;
        targetAmount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        desiredMonth: z.ZodString;
        priority: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        strategy: z.ZodEnum<{
            save: "save";
            invest: "invest";
        }>;
        annualReturnRate: z.ZodString;
        availability: z.ZodEnum<{
            available_now: "available_now";
            available_from: "available_from";
            long_term: "long_term";
        }>;
        availableFromMonth: z.ZodString;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    previewToken: z.ZodString;
}, z.core.$strict>;
declare const GoalEditUpdatedSchema: z.ZodObject<{
    status: z.ZodLiteral<"updated">;
}, z.core.$strict>;
declare const GoalEditStaleSchema: z.ZodObject<{
    status: z.ZodLiteral<"stale">;
    preview: z.ZodObject<{
        proposal: z.ZodObject<{
            normalizedGoal: z.ZodObject<{
                name: z.ZodString;
                type: z.ZodEnum<{
                    emergency_fund: "emergency_fund";
                    purchase: "purchase";
                    retirement: "retirement";
                    other: "other";
                }>;
                targetAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                desiredDate: z.ZodOptional<z.ZodISODate>;
                emergencyFundMonths: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>;
            investment: z.ZodOptional<z.ZodObject<{
                annualReturnRate: z.ZodString;
                availability: z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>;
                availableFrom: z.ZodOptional<z.ZodISODate>;
            }, z.core.$strict>>;
            allocation: z.ZodObject<{
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    percentage: z.ZodString;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    pending: z.ZodBoolean;
                }, z.core.$strict>>;
                totalPercentage: z.ZodString;
            }, z.core.$strict>;
            impacts: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"not_created">;
                }, z.core.$strict>, z.ZodObject<{
                    status: z.ZodLiteral<"existing">;
                    projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                        status: z.ZodLiteral<"available">;
                        completionMonth: z.ZodString;
                    }, z.core.$strict>, ...z.ZodObject<{
                        status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                    }, z.core.$strict>[]], "status">;
                    allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                }, z.core.$strict>], "status">;
                after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
            }, z.core.$strict>>;
            proposedSource: z.ZodObject<{
                profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    userId: z.ZodString;
                    baseCurrency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    expensesKnowledge: z.ZodString;
                    plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                    onboardingCompleted: z.ZodBoolean;
                }, z.core.$strict>>>;
                goals: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    name: z.ZodString;
                    type: z.ZodString;
                    targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    priority: z.ZodEnum<{
                        high: "high";
                        medium: "medium";
                        low: "low";
                    }>;
                    strategy: z.ZodEnum<{
                        save: "save";
                        invest: "invest";
                    }>;
                    status: z.ZodEnum<{
                        active: "active";
                        paused: "paused";
                        completed: "completed";
                    }>;
                    desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>;
                savingsPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                investmentPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    currentValue: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                        available_now: "available_now";
                        available_from: "available_from";
                        long_term: "long_term";
                    }>>>;
                    availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                snapshots: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>;
                allocations: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    snapshotId: z.ZodString;
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>>;
                expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                    endMonth: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>>>;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        previewToken: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const GoalEditConfirmationSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    status: z.ZodLiteral<"updated">;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<"stale">;
    preview: z.ZodObject<{
        proposal: z.ZodObject<{
            normalizedGoal: z.ZodObject<{
                name: z.ZodString;
                type: z.ZodEnum<{
                    emergency_fund: "emergency_fund";
                    purchase: "purchase";
                    retirement: "retirement";
                    other: "other";
                }>;
                targetAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                desiredDate: z.ZodOptional<z.ZodISODate>;
                emergencyFundMonths: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>;
            investment: z.ZodOptional<z.ZodObject<{
                annualReturnRate: z.ZodString;
                availability: z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>;
                availableFrom: z.ZodOptional<z.ZodISODate>;
            }, z.core.$strict>>;
            allocation: z.ZodObject<{
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodString;
                entries: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    percentage: z.ZodString;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    pending: z.ZodBoolean;
                }, z.core.$strict>>;
                totalPercentage: z.ZodString;
            }, z.core.$strict>;
            impacts: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                before: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"not_created">;
                }, z.core.$strict>, z.ZodObject<{
                    status: z.ZodLiteral<"existing">;
                    projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                        status: z.ZodLiteral<"available">;
                        completionMonth: z.ZodString;
                    }, z.core.$strict>, ...z.ZodObject<{
                        status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                    }, z.core.$strict>[]], "status">;
                    allocatedMonthlyAmounts: z.ZodArray<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                }, z.core.$strict>], "status">;
                after: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
            }, z.core.$strict>>;
            proposedSource: z.ZodObject<{
                profile: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    userId: z.ZodString;
                    baseCurrency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    expensesKnowledge: z.ZodString;
                    plannedMonthlyContribution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    goalDedicationPercentage: z.ZodOptional<z.ZodString>;
                    onboardingCompleted: z.ZodBoolean;
                }, z.core.$strict>>>;
                goals: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    name: z.ZodString;
                    type: z.ZodString;
                    targetAmount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    priority: z.ZodEnum<{
                        high: "high";
                        medium: "medium";
                        low: "low";
                    }>;
                    strategy: z.ZodEnum<{
                        save: "save";
                        invest: "invest";
                    }>;
                    status: z.ZodEnum<{
                        active: "active";
                        paused: "paused";
                        completed: "completed";
                    }>;
                    desiredDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    completedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    emergencyFundMonths: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>;
                savingsPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                investmentPositions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    currentValue: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    annualReturnRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    availability: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
                        available_now: "available_now";
                        available_from: "available_from";
                        long_term: "long_term";
                    }>>>;
                    availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$strict>>;
                snapshots: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>;
                allocations: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    snapshotId: z.ZodString;
                    goalId: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                incomes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                }, z.core.$strict>>>;
                expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    sourceKind: z.ZodString;
                    sourceId: z.ZodNullable<z.ZodString>;
                    sourceName: z.ZodNullable<z.ZodString>;
                    concept: z.ZodNullable<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    recurring: z.ZodBoolean;
                    effectiveMonth: z.ZodString;
                    endMonth: z.ZodNullable<z.ZodString>;
                }, z.core.$strict>>>;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    goalId: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    createdAt: z.ZodString;
                }, z.core.$strict>>>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        previewToken: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>], "status">;
declare const GoalsWorkspaceMissingSchema: z.ZodObject<{
    profile: z.ZodLiteral<"missing">;
}, z.core.$strict>;
declare const GoalsWorkspacePresentSchema: z.ZodObject<{
    profile: z.ZodLiteral<"present">;
    workspace: z.ZodObject<{
        financialSummary: z.ZodObject<{
            month: z.ZodString;
            income: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            expenses: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            balance: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            dedicationPercentage: z.ZodString;
            contribution: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        groups: z.ZodArray<z.ZodObject<{
            status: z.ZodEnum<{
                active: "active";
                paused: "paused";
                completed: "completed";
            }>;
            goals: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
                createdAt: z.ZodISODateTime;
                desiredDate: z.ZodOptional<z.ZodISODate>;
                completedAt: z.ZodOptional<z.ZodISODateTime>;
                targetAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                savingsValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                investmentValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                actualValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                progressPercentage: z.ZodOptional<z.ZodString>;
                funding: z.ZodArray<z.ZodObject<{
                    percentage: z.ZodString;
                    monthlyContribution: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    effectiveMonth: z.ZodISODate;
                }, z.core.$strict>>;
                projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
                desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
                annualReturnRate: z.ZodOptional<z.ZodString>;
                availability: z.ZodOptional<z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>>;
                availableFrom: z.ZodOptional<z.ZodISODate>;
                usesPlanningRate: z.ZodBoolean;
                completionEligible: z.ZodBoolean;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>;
                    createdAt: z.ZodISODateTime;
                }, z.core.$strict>>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const GoalsWorkspaceSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    profile: z.ZodLiteral<"missing">;
}, z.core.$strict>, z.ZodObject<{
    profile: z.ZodLiteral<"present">;
    workspace: z.ZodObject<{
        financialSummary: z.ZodObject<{
            month: z.ZodString;
            income: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            expenses: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            balance: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            dedicationPercentage: z.ZodString;
            contribution: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
        }, z.core.$strict>;
        groups: z.ZodArray<z.ZodObject<{
            status: z.ZodEnum<{
                active: "active";
                paused: "paused";
                completed: "completed";
            }>;
            goals: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
                createdAt: z.ZodISODateTime;
                desiredDate: z.ZodOptional<z.ZodISODate>;
                completedAt: z.ZodOptional<z.ZodISODateTime>;
                targetAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                savingsValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                investmentValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                actualValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                progressPercentage: z.ZodOptional<z.ZodString>;
                funding: z.ZodArray<z.ZodObject<{
                    percentage: z.ZodString;
                    monthlyContribution: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    effectiveMonth: z.ZodISODate;
                }, z.core.$strict>>;
                projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
                desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
                annualReturnRate: z.ZodOptional<z.ZodString>;
                availability: z.ZodOptional<z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>>;
                availableFrom: z.ZodOptional<z.ZodISODate>;
                usesPlanningRate: z.ZodBoolean;
                completionEligible: z.ZodBoolean;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>;
                    createdAt: z.ZodISODateTime;
                }, z.core.$strict>>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>], "profile">;
type GoalsWorkspace = z.infer<typeof GoalsWorkspaceSchema>;
type GoalsWorkspaceData = z.infer<typeof WorkspaceSchema>;
type GoalWorkspaceItem = GoalsWorkspaceData['groups'][number]['goals'][number];
type GoalStatus = GoalWorkspaceItem['status'];
type GoalCreationDraftWire = z.infer<typeof GoalCreationDraftWireSchema>;
type GoalCreationContextState = z.infer<typeof GoalCreationContextStateSchema>;
type GoalCreationPreview = z.infer<typeof GoalCreationPreviewSchema>;
type GoalCreationConfirmation = z.infer<typeof GoalCreationConfirmationSchema>;
type AllocationChangeDraftWire = z.infer<typeof AllocationChangeDraftWireSchema>;
type AllocationChangeContext = z.infer<typeof AllocationChangeContextSchema>;
type AllocationChangeContextState = z.infer<typeof AllocationChangeContextStateSchema>;
type AllocationChangePreview = z.infer<typeof AllocationChangePreviewSchema>;
type AllocationChangeConfirmation = z.infer<typeof AllocationChangeConfirmationSchema>;
type GoalLifecycleContext = z.infer<typeof GoalLifecycleContextSchema>;
type GoalLifecyclePreview = z.infer<typeof GoalLifecyclePreviewSchema>;
type GoalLifecycleConfirmation = z.infer<typeof GoalLifecycleConfirmationSchema>;
type GoalCompletionContext = z.infer<typeof GoalCompletionContextSchema>;
type GoalCompletionContextState = z.infer<typeof GoalCompletionContextStateSchema>;
type GoalCompletionPreview = z.infer<typeof GoalCompletionPreviewSchema>;
type GoalCompletionConfirmation = z.infer<typeof GoalCompletionConfirmationSchema>;
type GoalPriority = GoalWorkspaceItem['priority'];
type ContributionSummary = z.infer<typeof ContributionSummarySchema>;
type SavingContributionSummary = ContributionSummary;
type GoalsFinancialSummary = GoalsWorkspaceData['financialSummary'];
type GoalStrategy = GoalWorkspaceItem['strategy'];
type GoalProjection = GoalWorkspaceItem['projection'];
type GoalFundingRow = GoalWorkspaceItem['funding'][number];
type ContributionAllocationSummary = ContributionSummary['allocations'][number];
type ContributionKind = ContributionSummary['kind'];
type InvestmentAvailability = NonNullable<GoalWorkspaceItem['availability']>;
type GoalCompletionWithdrawalSummary = NonNullable<GoalWorkspaceItem['completionWithdrawals']>[number];
type GoalsAppState = GoalsWorkspace;
type GoalCreationContext = z.infer<typeof GoalCreationContextWireSchema>;
type GoalCreationPreviewResult = GoalCreationPreview;
type GoalLifecyclePreviewResult = GoalLifecyclePreview;
type AllocationChangePreviewResult = AllocationChangePreview;
type GoalCompletionPreviewResult = GoalCompletionPreview;

declare const HomeQuerySchema: z.ZodObject<{
    currentMonth: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
declare const RoadmapIncomeSchema: z.ZodObject<{
    id: z.ZodString;
    sourceKind: z.ZodString;
    sourceId: z.ZodNullable<z.ZodString>;
    sourceName: z.ZodString;
    concept: z.ZodNullable<z.ZodString>;
    amount: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    recurring: z.ZodBoolean;
    effectiveMonth: z.ZodString;
    arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>;
declare const RoadmapExpenseSchema: z.ZodObject<{
    id: z.ZodString;
    sourceKind: z.ZodString;
    sourceId: z.ZodNullable<z.ZodString>;
    sourceName: z.ZodString;
    concept: z.ZodNullable<z.ZodString>;
    amount: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    recurring: z.ZodBoolean;
    effectiveMonth: z.ZodString;
    arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    endMonth: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
declare const RoadmapFinancesSchema: z.ZodObject<{
    incomes: z.ZodObject<{
        sources: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            normalizedName: z.ZodString;
        }, z.core.$strict>>>;
        incomes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    expenses: z.ZodObject<{
        sources: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            normalizedName: z.ZodString;
        }, z.core.$strict>>>;
        expenses: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            endMonth: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>;
declare const RoadmapMonthSchema: z.ZodObject<{
    month: z.ZodString;
    objectives: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        priority: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        strategy: z.ZodEnum<{
            save: "save";
            invest: "invest";
        }>;
        status: z.ZodEnum<{
            active: "active";
            paused: "paused";
            completed: "completed";
        }>;
        createdAt: z.ZodISODateTime;
        desiredDate: z.ZodOptional<z.ZodISODate>;
        completedAt: z.ZodOptional<z.ZodISODateTime>;
        targetAmount: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        savingsValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        investmentValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        actualValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        progressPercentage: z.ZodOptional<z.ZodString>;
        funding: z.ZodArray<z.ZodObject<{
            percentage: z.ZodString;
            monthlyContribution: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            effectiveMonth: z.ZodISODate;
        }, z.core.$strict>>;
        projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
            status: z.ZodLiteral<"available">;
            completionMonth: z.ZodString;
        }, z.core.$strict>, ...z.ZodObject<{
            status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
        }, z.core.$strict>[]], "status">;
        desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
        annualReturnRate: z.ZodOptional<z.ZodString>;
        availability: z.ZodOptional<z.ZodEnum<{
            available_now: "available_now";
            available_from: "available_from";
            long_term: "long_term";
        }>>;
        availableFrom: z.ZodOptional<z.ZodISODate>;
        usesPlanningRate: z.ZodBoolean;
        completionEligible: z.ZodBoolean;
        completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            placeId: z.ZodString;
            placeName: z.ZodString;
            amount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            createdAt: z.ZodISODateTime;
        }, z.core.$strict>>>;
        contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>;
            userId: z.ZodOptional<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            placeId: z.ZodOptional<z.ZodString>;
            placeName: z.ZodOptional<z.ZodString>;
            arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodISODateTime;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                amount: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>>;
        savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>;
            userId: z.ZodOptional<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            placeId: z.ZodOptional<z.ZodString>;
            placeName: z.ZodOptional<z.ZodString>;
            arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodISODateTime;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                amount: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
    oneTimeExpenses: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceKind: z.ZodString;
        sourceId: z.ZodNullable<z.ZodString>;
        sourceName: z.ZodString;
        concept: z.ZodNullable<z.ZodString>;
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        recurring: z.ZodBoolean;
        effectiveMonth: z.ZodString;
        arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        endMonth: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>>;
    recurringExpenses: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceKind: z.ZodString;
        sourceId: z.ZodNullable<z.ZodString>;
        sourceName: z.ZodString;
        concept: z.ZodNullable<z.ZodString>;
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        recurring: z.ZodBoolean;
        effectiveMonth: z.ZodString;
        arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        endMonth: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>>;
    endingExpenses: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceKind: z.ZodString;
        sourceId: z.ZodNullable<z.ZodString>;
        sourceName: z.ZodString;
        concept: z.ZodNullable<z.ZodString>;
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        recurring: z.ZodBoolean;
        effectiveMonth: z.ZodString;
        arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        endMonth: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>>;
    oneTimeIncomes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceKind: z.ZodString;
        sourceId: z.ZodNullable<z.ZodString>;
        sourceName: z.ZodString;
        concept: z.ZodNullable<z.ZodString>;
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        recurring: z.ZodBoolean;
        effectiveMonth: z.ZodString;
        arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>>;
    recurringIncomes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceKind: z.ZodString;
        sourceId: z.ZodNullable<z.ZodString>;
        sourceName: z.ZodString;
        concept: z.ZodNullable<z.ZodString>;
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        recurring: z.ZodBoolean;
        effectiveMonth: z.ZodString;
        arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>>;
    contributions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<{
            saving: "saving";
            investment: "investment";
        }>;
        userId: z.ZodOptional<z.ZodString>;
        amount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        placeId: z.ZodOptional<z.ZodString>;
        placeName: z.ZodOptional<z.ZodString>;
        arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodISODateTime;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            goalName: z.ZodString;
            amount: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const RoadmapDataSchema: z.ZodObject<{
    undatedObjectives: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        priority: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        strategy: z.ZodEnum<{
            save: "save";
            invest: "invest";
        }>;
        status: z.ZodEnum<{
            active: "active";
            paused: "paused";
            completed: "completed";
        }>;
        createdAt: z.ZodISODateTime;
        desiredDate: z.ZodOptional<z.ZodISODate>;
        completedAt: z.ZodOptional<z.ZodISODateTime>;
        targetAmount: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        savingsValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        investmentValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        actualValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        progressPercentage: z.ZodOptional<z.ZodString>;
        funding: z.ZodArray<z.ZodObject<{
            percentage: z.ZodString;
            monthlyContribution: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            effectiveMonth: z.ZodISODate;
        }, z.core.$strict>>;
        projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
            status: z.ZodLiteral<"available">;
            completionMonth: z.ZodString;
        }, z.core.$strict>, ...z.ZodObject<{
            status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
        }, z.core.$strict>[]], "status">;
        desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
        annualReturnRate: z.ZodOptional<z.ZodString>;
        availability: z.ZodOptional<z.ZodEnum<{
            available_now: "available_now";
            available_from: "available_from";
            long_term: "long_term";
        }>>;
        availableFrom: z.ZodOptional<z.ZodISODate>;
        usesPlanningRate: z.ZodBoolean;
        completionEligible: z.ZodBoolean;
        completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            placeId: z.ZodString;
            placeName: z.ZodString;
            amount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            createdAt: z.ZodISODateTime;
        }, z.core.$strict>>>;
        contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>;
            userId: z.ZodOptional<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            placeId: z.ZodOptional<z.ZodString>;
            placeName: z.ZodOptional<z.ZodString>;
            arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodISODateTime;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                amount: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>>;
        savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>;
            userId: z.ZodOptional<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            placeId: z.ZodOptional<z.ZodString>;
            placeName: z.ZodOptional<z.ZodString>;
            arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodISODateTime;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                amount: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
    futureMonths: z.ZodArray<z.ZodObject<{
        month: z.ZodString;
        objectives: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            priority: z.ZodEnum<{
                high: "high";
                medium: "medium";
                low: "low";
            }>;
            strategy: z.ZodEnum<{
                save: "save";
                invest: "invest";
            }>;
            status: z.ZodEnum<{
                active: "active";
                paused: "paused";
                completed: "completed";
            }>;
            createdAt: z.ZodISODateTime;
            desiredDate: z.ZodOptional<z.ZodISODate>;
            completedAt: z.ZodOptional<z.ZodISODateTime>;
            targetAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            savingsValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            investmentValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            actualValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            progressPercentage: z.ZodOptional<z.ZodString>;
            funding: z.ZodArray<z.ZodObject<{
                percentage: z.ZodString;
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodISODate;
            }, z.core.$strict>>;
            projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
            desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
            annualReturnRate: z.ZodOptional<z.ZodString>;
            availability: z.ZodOptional<z.ZodEnum<{
                available_now: "available_now";
                available_from: "available_from";
                long_term: "long_term";
            }>>;
            availableFrom: z.ZodOptional<z.ZodISODate>;
            usesPlanningRate: z.ZodBoolean;
            completionEligible: z.ZodBoolean;
            completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                placeId: z.ZodString;
                placeName: z.ZodString;
                amount: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                createdAt: z.ZodISODateTime;
            }, z.core.$strict>>>;
            contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
        oneTimeExpenses: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            endMonth: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        recurringExpenses: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            endMonth: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        endingExpenses: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            endMonth: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        oneTimeIncomes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strict>>;
        recurringIncomes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strict>>;
        contributions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>;
            userId: z.ZodOptional<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            placeId: z.ZodOptional<z.ZodString>;
            placeName: z.ZodOptional<z.ZodString>;
            arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodISODateTime;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                amount: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    currentMonth: z.ZodObject<{
        month: z.ZodString;
        objectives: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            priority: z.ZodEnum<{
                high: "high";
                medium: "medium";
                low: "low";
            }>;
            strategy: z.ZodEnum<{
                save: "save";
                invest: "invest";
            }>;
            status: z.ZodEnum<{
                active: "active";
                paused: "paused";
                completed: "completed";
            }>;
            createdAt: z.ZodISODateTime;
            desiredDate: z.ZodOptional<z.ZodISODate>;
            completedAt: z.ZodOptional<z.ZodISODateTime>;
            targetAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            savingsValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            investmentValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            actualValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            progressPercentage: z.ZodOptional<z.ZodString>;
            funding: z.ZodArray<z.ZodObject<{
                percentage: z.ZodString;
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodISODate;
            }, z.core.$strict>>;
            projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
            desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
            annualReturnRate: z.ZodOptional<z.ZodString>;
            availability: z.ZodOptional<z.ZodEnum<{
                available_now: "available_now";
                available_from: "available_from";
                long_term: "long_term";
            }>>;
            availableFrom: z.ZodOptional<z.ZodISODate>;
            usesPlanningRate: z.ZodBoolean;
            completionEligible: z.ZodBoolean;
            completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                placeId: z.ZodString;
                placeName: z.ZodString;
                amount: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                createdAt: z.ZodISODateTime;
            }, z.core.$strict>>>;
            contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
        oneTimeExpenses: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            endMonth: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        recurringExpenses: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            endMonth: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        endingExpenses: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            endMonth: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        oneTimeIncomes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strict>>;
        recurringIncomes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strict>>;
        contributions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>;
            userId: z.ZodOptional<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            placeId: z.ZodOptional<z.ZodString>;
            placeName: z.ZodOptional<z.ZodString>;
            arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodISODateTime;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                amount: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    historyMonths: z.ZodArray<z.ZodObject<{
        month: z.ZodString;
        objectives: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            priority: z.ZodEnum<{
                high: "high";
                medium: "medium";
                low: "low";
            }>;
            strategy: z.ZodEnum<{
                save: "save";
                invest: "invest";
            }>;
            status: z.ZodEnum<{
                active: "active";
                paused: "paused";
                completed: "completed";
            }>;
            createdAt: z.ZodISODateTime;
            desiredDate: z.ZodOptional<z.ZodISODate>;
            completedAt: z.ZodOptional<z.ZodISODateTime>;
            targetAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            savingsValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            investmentValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            actualValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            progressPercentage: z.ZodOptional<z.ZodString>;
            funding: z.ZodArray<z.ZodObject<{
                percentage: z.ZodString;
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodISODate;
            }, z.core.$strict>>;
            projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
            desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
            annualReturnRate: z.ZodOptional<z.ZodString>;
            availability: z.ZodOptional<z.ZodEnum<{
                available_now: "available_now";
                available_from: "available_from";
                long_term: "long_term";
            }>>;
            availableFrom: z.ZodOptional<z.ZodISODate>;
            usesPlanningRate: z.ZodBoolean;
            completionEligible: z.ZodBoolean;
            completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                placeId: z.ZodString;
                placeName: z.ZodString;
                amount: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                createdAt: z.ZodISODateTime;
            }, z.core.$strict>>>;
            contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
        oneTimeExpenses: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            endMonth: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        recurringExpenses: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            endMonth: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        endingExpenses: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            endMonth: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
        oneTimeIncomes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strict>>;
        recurringIncomes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            sourceKind: z.ZodString;
            sourceId: z.ZodNullable<z.ZodString>;
            sourceName: z.ZodString;
            concept: z.ZodNullable<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            recurring: z.ZodBoolean;
            effectiveMonth: z.ZodString;
            arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strict>>;
        contributions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>;
            userId: z.ZodOptional<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            placeId: z.ZodOptional<z.ZodString>;
            placeName: z.ZodOptional<z.ZodString>;
            arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodISODateTime;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                amount: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const HomeRoadmapMissingSchema: z.ZodObject<{
    profile: z.ZodLiteral<"missing">;
}, z.core.$strict>;
declare const HomeRoadmapPresentSchema: z.ZodObject<{
    profile: z.ZodOptional<z.ZodLiteral<"present">>;
    roadmap: z.ZodObject<{
        undatedObjectives: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            priority: z.ZodEnum<{
                high: "high";
                medium: "medium";
                low: "low";
            }>;
            strategy: z.ZodEnum<{
                save: "save";
                invest: "invest";
            }>;
            status: z.ZodEnum<{
                active: "active";
                paused: "paused";
                completed: "completed";
            }>;
            createdAt: z.ZodISODateTime;
            desiredDate: z.ZodOptional<z.ZodISODate>;
            completedAt: z.ZodOptional<z.ZodISODateTime>;
            targetAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            savingsValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            investmentValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            actualValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            progressPercentage: z.ZodOptional<z.ZodString>;
            funding: z.ZodArray<z.ZodObject<{
                percentage: z.ZodString;
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodISODate;
            }, z.core.$strict>>;
            projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
            desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
            annualReturnRate: z.ZodOptional<z.ZodString>;
            availability: z.ZodOptional<z.ZodEnum<{
                available_now: "available_now";
                available_from: "available_from";
                long_term: "long_term";
            }>>;
            availableFrom: z.ZodOptional<z.ZodISODate>;
            usesPlanningRate: z.ZodBoolean;
            completionEligible: z.ZodBoolean;
            completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                placeId: z.ZodString;
                placeName: z.ZodString;
                amount: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                createdAt: z.ZodISODateTime;
            }, z.core.$strict>>>;
            contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
        futureMonths: z.ZodArray<z.ZodObject<{
            month: z.ZodString;
            objectives: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
                createdAt: z.ZodISODateTime;
                desiredDate: z.ZodOptional<z.ZodISODate>;
                completedAt: z.ZodOptional<z.ZodISODateTime>;
                targetAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                savingsValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                investmentValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                actualValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                progressPercentage: z.ZodOptional<z.ZodString>;
                funding: z.ZodArray<z.ZodObject<{
                    percentage: z.ZodString;
                    monthlyContribution: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    effectiveMonth: z.ZodISODate;
                }, z.core.$strict>>;
                projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
                desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
                annualReturnRate: z.ZodOptional<z.ZodString>;
                availability: z.ZodOptional<z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>>;
                availableFrom: z.ZodOptional<z.ZodISODate>;
                usesPlanningRate: z.ZodBoolean;
                completionEligible: z.ZodBoolean;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>;
                    createdAt: z.ZodISODateTime;
                }, z.core.$strict>>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
            }, z.core.$strict>>;
            oneTimeExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            recurringExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            endingExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            oneTimeIncomes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            recurringIncomes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            contributions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        currentMonth: z.ZodObject<{
            month: z.ZodString;
            objectives: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
                createdAt: z.ZodISODateTime;
                desiredDate: z.ZodOptional<z.ZodISODate>;
                completedAt: z.ZodOptional<z.ZodISODateTime>;
                targetAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                savingsValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                investmentValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                actualValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                progressPercentage: z.ZodOptional<z.ZodString>;
                funding: z.ZodArray<z.ZodObject<{
                    percentage: z.ZodString;
                    monthlyContribution: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    effectiveMonth: z.ZodISODate;
                }, z.core.$strict>>;
                projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
                desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
                annualReturnRate: z.ZodOptional<z.ZodString>;
                availability: z.ZodOptional<z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>>;
                availableFrom: z.ZodOptional<z.ZodISODate>;
                usesPlanningRate: z.ZodBoolean;
                completionEligible: z.ZodBoolean;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>;
                    createdAt: z.ZodISODateTime;
                }, z.core.$strict>>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
            }, z.core.$strict>>;
            oneTimeExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            recurringExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            endingExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            oneTimeIncomes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            recurringIncomes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            contributions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        historyMonths: z.ZodArray<z.ZodObject<{
            month: z.ZodString;
            objectives: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
                createdAt: z.ZodISODateTime;
                desiredDate: z.ZodOptional<z.ZodISODate>;
                completedAt: z.ZodOptional<z.ZodISODateTime>;
                targetAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                savingsValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                investmentValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                actualValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                progressPercentage: z.ZodOptional<z.ZodString>;
                funding: z.ZodArray<z.ZodObject<{
                    percentage: z.ZodString;
                    monthlyContribution: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    effectiveMonth: z.ZodISODate;
                }, z.core.$strict>>;
                projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
                desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
                annualReturnRate: z.ZodOptional<z.ZodString>;
                availability: z.ZodOptional<z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>>;
                availableFrom: z.ZodOptional<z.ZodISODate>;
                usesPlanningRate: z.ZodBoolean;
                completionEligible: z.ZodBoolean;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>;
                    createdAt: z.ZodISODateTime;
                }, z.core.$strict>>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
            }, z.core.$strict>>;
            oneTimeExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            recurringExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            endingExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            oneTimeIncomes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            recurringIncomes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            contributions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    completionGoals: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        priority: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        strategy: z.ZodEnum<{
            save: "save";
            invest: "invest";
        }>;
        status: z.ZodEnum<{
            active: "active";
            paused: "paused";
            completed: "completed";
        }>;
        createdAt: z.ZodISODateTime;
        desiredDate: z.ZodOptional<z.ZodISODate>;
        completedAt: z.ZodOptional<z.ZodISODateTime>;
        targetAmount: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        savingsValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        investmentValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        actualValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        progressPercentage: z.ZodOptional<z.ZodString>;
        funding: z.ZodArray<z.ZodObject<{
            percentage: z.ZodString;
            monthlyContribution: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            effectiveMonth: z.ZodISODate;
        }, z.core.$strict>>;
        projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
            status: z.ZodLiteral<"available">;
            completionMonth: z.ZodString;
        }, z.core.$strict>, ...z.ZodObject<{
            status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
        }, z.core.$strict>[]], "status">;
        desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
        annualReturnRate: z.ZodOptional<z.ZodString>;
        availability: z.ZodOptional<z.ZodEnum<{
            available_now: "available_now";
            available_from: "available_from";
            long_term: "long_term";
        }>>;
        availableFrom: z.ZodOptional<z.ZodISODate>;
        usesPlanningRate: z.ZodBoolean;
        completionEligible: z.ZodBoolean;
        completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            placeId: z.ZodString;
            placeName: z.ZodString;
            amount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            createdAt: z.ZodISODateTime;
        }, z.core.$strict>>>;
        contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>;
            userId: z.ZodOptional<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            placeId: z.ZodOptional<z.ZodString>;
            placeName: z.ZodOptional<z.ZodString>;
            arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodISODateTime;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                amount: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>>;
        savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>;
            userId: z.ZodOptional<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            placeId: z.ZodOptional<z.ZodString>;
            placeName: z.ZodOptional<z.ZodString>;
            arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodISODateTime;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                amount: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const HomeRoadmapResponseSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    profile: z.ZodLiteral<"missing">;
}, z.core.$strict>, z.ZodObject<{
    profile: z.ZodOptional<z.ZodLiteral<"present">>;
    roadmap: z.ZodObject<{
        undatedObjectives: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            priority: z.ZodEnum<{
                high: "high";
                medium: "medium";
                low: "low";
            }>;
            strategy: z.ZodEnum<{
                save: "save";
                invest: "invest";
            }>;
            status: z.ZodEnum<{
                active: "active";
                paused: "paused";
                completed: "completed";
            }>;
            createdAt: z.ZodISODateTime;
            desiredDate: z.ZodOptional<z.ZodISODate>;
            completedAt: z.ZodOptional<z.ZodISODateTime>;
            targetAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            savingsValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            investmentValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            actualValue: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            progressPercentage: z.ZodOptional<z.ZodString>;
            funding: z.ZodArray<z.ZodObject<{
                percentage: z.ZodString;
                monthlyContribution: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                effectiveMonth: z.ZodISODate;
            }, z.core.$strict>>;
            projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                status: z.ZodLiteral<"available">;
                completionMonth: z.ZodString;
            }, z.core.$strict>, ...z.ZodObject<{
                status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
            }, z.core.$strict>[]], "status">;
            desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
            annualReturnRate: z.ZodOptional<z.ZodString>;
            availability: z.ZodOptional<z.ZodEnum<{
                available_now: "available_now";
                available_from: "available_from";
                long_term: "long_term";
            }>>;
            availableFrom: z.ZodOptional<z.ZodISODate>;
            usesPlanningRate: z.ZodBoolean;
            completionEligible: z.ZodBoolean;
            completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                placeId: z.ZodString;
                placeName: z.ZodString;
                amount: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                createdAt: z.ZodISODateTime;
            }, z.core.$strict>>>;
            contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
            savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
        futureMonths: z.ZodArray<z.ZodObject<{
            month: z.ZodString;
            objectives: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
                createdAt: z.ZodISODateTime;
                desiredDate: z.ZodOptional<z.ZodISODate>;
                completedAt: z.ZodOptional<z.ZodISODateTime>;
                targetAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                savingsValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                investmentValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                actualValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                progressPercentage: z.ZodOptional<z.ZodString>;
                funding: z.ZodArray<z.ZodObject<{
                    percentage: z.ZodString;
                    monthlyContribution: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    effectiveMonth: z.ZodISODate;
                }, z.core.$strict>>;
                projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
                desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
                annualReturnRate: z.ZodOptional<z.ZodString>;
                availability: z.ZodOptional<z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>>;
                availableFrom: z.ZodOptional<z.ZodISODate>;
                usesPlanningRate: z.ZodBoolean;
                completionEligible: z.ZodBoolean;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>;
                    createdAt: z.ZodISODateTime;
                }, z.core.$strict>>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
            }, z.core.$strict>>;
            oneTimeExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            recurringExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            endingExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            oneTimeIncomes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            recurringIncomes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            contributions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        currentMonth: z.ZodObject<{
            month: z.ZodString;
            objectives: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
                createdAt: z.ZodISODateTime;
                desiredDate: z.ZodOptional<z.ZodISODate>;
                completedAt: z.ZodOptional<z.ZodISODateTime>;
                targetAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                savingsValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                investmentValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                actualValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                progressPercentage: z.ZodOptional<z.ZodString>;
                funding: z.ZodArray<z.ZodObject<{
                    percentage: z.ZodString;
                    monthlyContribution: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    effectiveMonth: z.ZodISODate;
                }, z.core.$strict>>;
                projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
                desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
                annualReturnRate: z.ZodOptional<z.ZodString>;
                availability: z.ZodOptional<z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>>;
                availableFrom: z.ZodOptional<z.ZodISODate>;
                usesPlanningRate: z.ZodBoolean;
                completionEligible: z.ZodBoolean;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>;
                    createdAt: z.ZodISODateTime;
                }, z.core.$strict>>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
            }, z.core.$strict>>;
            oneTimeExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            recurringExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            endingExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            oneTimeIncomes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            recurringIncomes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            contributions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        historyMonths: z.ZodArray<z.ZodObject<{
            month: z.ZodString;
            objectives: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                priority: z.ZodEnum<{
                    high: "high";
                    medium: "medium";
                    low: "low";
                }>;
                strategy: z.ZodEnum<{
                    save: "save";
                    invest: "invest";
                }>;
                status: z.ZodEnum<{
                    active: "active";
                    paused: "paused";
                    completed: "completed";
                }>;
                createdAt: z.ZodISODateTime;
                desiredDate: z.ZodOptional<z.ZodISODate>;
                completedAt: z.ZodOptional<z.ZodISODateTime>;
                targetAmount: z.ZodOptional<z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>>;
                savingsValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                investmentValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                actualValue: z.ZodObject<{
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                }, z.core.$strict>;
                progressPercentage: z.ZodOptional<z.ZodString>;
                funding: z.ZodArray<z.ZodObject<{
                    percentage: z.ZodString;
                    monthlyContribution: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>>;
                    effectiveMonth: z.ZodISODate;
                }, z.core.$strict>>;
                projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    status: z.ZodLiteral<"available">;
                    completionMonth: z.ZodString;
                }, z.core.$strict>, ...z.ZodObject<{
                    status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
                }, z.core.$strict>[]], "status">;
                desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
                annualReturnRate: z.ZodOptional<z.ZodString>;
                availability: z.ZodOptional<z.ZodEnum<{
                    available_now: "available_now";
                    available_from: "available_from";
                    long_term: "long_term";
                }>>;
                availableFrom: z.ZodOptional<z.ZodISODate>;
                usesPlanningRate: z.ZodBoolean;
                completionEligible: z.ZodBoolean;
                completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    placeId: z.ZodString;
                    placeName: z.ZodString;
                    amount: z.ZodObject<{
                        amount: z.ZodString;
                        currency: z.ZodEnum<{
                            ARS: "ARS";
                            USD: "USD";
                        }>;
                    }, z.core.$strict>;
                    createdAt: z.ZodISODateTime;
                }, z.core.$strict>>>;
                contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
                savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodEnum<{
                        saving: "saving";
                        investment: "investment";
                    }>;
                    userId: z.ZodOptional<z.ZodString>;
                    amount: z.ZodString;
                    currency: z.ZodEnum<{
                        ARS: "ARS";
                        USD: "USD";
                    }>;
                    placeId: z.ZodOptional<z.ZodString>;
                    placeName: z.ZodOptional<z.ZodString>;
                    arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodISODateTime;
                    allocations: z.ZodArray<z.ZodObject<{
                        goalId: z.ZodString;
                        goalName: z.ZodString;
                        amount: z.ZodString;
                        percentage: z.ZodString;
                    }, z.core.$strict>>;
                }, z.core.$strict>>>;
            }, z.core.$strict>>;
            oneTimeExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            recurringExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            endingExpenses: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                endMonth: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            oneTimeIncomes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            recurringIncomes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceKind: z.ZodString;
                sourceId: z.ZodNullable<z.ZodString>;
                sourceName: z.ZodString;
                concept: z.ZodNullable<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                recurring: z.ZodBoolean;
                effectiveMonth: z.ZodString;
                arsEquivalent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strict>>;
            contributions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<{
                    saving: "saving";
                    investment: "investment";
                }>;
                userId: z.ZodOptional<z.ZodString>;
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
                placeId: z.ZodOptional<z.ZodString>;
                placeName: z.ZodOptional<z.ZodString>;
                arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodISODateTime;
                allocations: z.ZodArray<z.ZodObject<{
                    goalId: z.ZodString;
                    goalName: z.ZodString;
                    amount: z.ZodString;
                    percentage: z.ZodString;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    completionGoals: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        priority: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        strategy: z.ZodEnum<{
            save: "save";
            invest: "invest";
        }>;
        status: z.ZodEnum<{
            active: "active";
            paused: "paused";
            completed: "completed";
        }>;
        createdAt: z.ZodISODateTime;
        desiredDate: z.ZodOptional<z.ZodISODate>;
        completedAt: z.ZodOptional<z.ZodISODateTime>;
        targetAmount: z.ZodOptional<z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>>;
        savingsValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        investmentValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        actualValue: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
        }, z.core.$strict>;
        progressPercentage: z.ZodOptional<z.ZodString>;
        funding: z.ZodArray<z.ZodObject<{
            percentage: z.ZodString;
            monthlyContribution: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            allocatedBaseAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            allocatedDestinationAmount: z.ZodOptional<z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>>;
            effectiveMonth: z.ZodISODate;
        }, z.core.$strict>>;
        projection: z.ZodDiscriminatedUnion<[z.ZodObject<{
            status: z.ZodLiteral<"available">;
            completionMonth: z.ZodString;
        }, z.core.$strict>, ...z.ZodObject<{
            status: z.ZodLiteral<"target_unavailable" | "no_future_allocation" | "commitment_absent" | "plan_paused" | "investment_assumption_unavailable" | "outside_horizon">;
        }, z.core.$strict>[]], "status">;
        desiredDateDeltaMonths: z.ZodOptional<z.ZodNumber>;
        annualReturnRate: z.ZodOptional<z.ZodString>;
        availability: z.ZodOptional<z.ZodEnum<{
            available_now: "available_now";
            available_from: "available_from";
            long_term: "long_term";
        }>>;
        availableFrom: z.ZodOptional<z.ZodISODate>;
        usesPlanningRate: z.ZodBoolean;
        completionEligible: z.ZodBoolean;
        completionWithdrawals: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            placeId: z.ZodString;
            placeName: z.ZodString;
            amount: z.ZodObject<{
                amount: z.ZodString;
                currency: z.ZodEnum<{
                    ARS: "ARS";
                    USD: "USD";
                }>;
            }, z.core.$strict>;
            createdAt: z.ZodISODateTime;
        }, z.core.$strict>>>;
        contributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>;
            userId: z.ZodOptional<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            placeId: z.ZodOptional<z.ZodString>;
            placeName: z.ZodOptional<z.ZodString>;
            arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodISODateTime;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                amount: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>>;
        savingContributions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<{
                saving: "saving";
                investment: "investment";
            }>;
            userId: z.ZodOptional<z.ZodString>;
            amount: z.ZodString;
            currency: z.ZodEnum<{
                ARS: "ARS";
                USD: "USD";
            }>;
            placeId: z.ZodOptional<z.ZodString>;
            placeName: z.ZodOptional<z.ZodString>;
            arsSpent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            effectiveRate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodISODateTime;
            allocations: z.ZodArray<z.ZodObject<{
                goalId: z.ZodString;
                goalName: z.ZodString;
                amount: z.ZodString;
                percentage: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
}, z.core.$strict>], "profile">;
type HomeQuery = z.infer<typeof HomeQuerySchema>;
type RoadmapIncome = z.infer<typeof RoadmapIncomeSchema>;
type RoadmapExpense = z.infer<typeof RoadmapExpenseSchema>;
type RoadmapFinances = z.infer<typeof RoadmapFinancesSchema>;
type RoadmapMonth = z.infer<typeof RoadmapMonthSchema>;
type RoadmapData = z.infer<typeof RoadmapDataSchema>;
type HomeRoadmapResponse = z.infer<typeof HomeRoadmapResponseSchema>;
type HomeRoadmapPresent = z.infer<typeof HomeRoadmapPresentSchema>;
type HomeRoadmapMissing = z.infer<typeof HomeRoadmapMissingSchema>;

declare const goalTypeSchema: z.ZodEnum<{
    emergency_fund: "emergency_fund";
    purchase: "purchase";
    retirement: "retirement";
    other: "other";
}>;
declare const goalPrioritySchema: z.ZodEnum<{
    high: "high";
    medium: "medium";
    low: "low";
}>;
declare const goalStrategySchema: z.ZodEnum<{
    save: "save";
    invest: "invest";
}>;
declare const investmentAvailabilitySchema: z.ZodEnum<{
    available_now: "available_now";
    available_from: "available_from";
    long_term: "long_term";
}>;
declare const allocationEntrySchema: z.ZodObject<{
    goalId: z.ZodString;
    percentage: z.ZodString;
}, z.core.$strip>;
declare const goalCreationDraftSchema: z.ZodObject<{
    type: z.ZodEnum<{
        emergency_fund: "emergency_fund";
        purchase: "purchase";
        retirement: "retirement";
        other: "other";
    }>;
    name: z.ZodString;
    targetAmount: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    desiredMonth: z.ZodString;
    priority: z.ZodEnum<{
        high: "high";
        medium: "medium";
        low: "low";
    }>;
    strategy: z.ZodEnum<{
        save: "save";
        invest: "invest";
    }>;
    annualReturnRate: z.ZodString;
    availability: z.ZodEnum<{
        available_now: "available_now";
        available_from: "available_from";
        long_term: "long_term";
    }>;
    availableFromMonth: z.ZodString;
    allocations: z.ZodArray<z.ZodObject<{
        goalId: z.ZodString;
        percentage: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
type GoalCreationDraft = z.infer<typeof goalCreationDraftSchema>;
declare function createObjectiveSchema(currentMonth: string): z.ZodObject<{
    type: z.ZodEnum<{
        emergency_fund: "emergency_fund";
        purchase: "purchase";
        retirement: "retirement";
        other: "other";
    }>;
    name: z.ZodString;
    targetAmount: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    desiredMonth: z.ZodString;
    priority: z.ZodEnum<{
        high: "high";
        medium: "medium";
        low: "low";
    }>;
    strategy: z.ZodEnum<{
        save: "save";
        invest: "invest";
    }>;
    annualReturnRate: z.ZodString;
    availability: z.ZodEnum<{
        available_now: "available_now";
        available_from: "available_from";
        long_term: "long_term";
    }>;
    availableFromMonth: z.ZodString;
    allocations: z.ZodArray<z.ZodObject<{
        goalId: z.ZodString;
        percentage: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const goalPlanSchema: z.ZodObject<{
    type: z.ZodEnum<{
        emergency_fund: "emergency_fund";
        purchase: "purchase";
        retirement: "retirement";
        other: "other";
    }>;
    name: z.ZodString;
    targetAmount: z.ZodString;
    currency: z.ZodEnum<{
        ARS: "ARS";
        USD: "USD";
    }>;
    desiredMonth: z.ZodString;
    priority: z.ZodEnum<{
        high: "high";
        medium: "medium";
        low: "low";
    }>;
    strategy: z.ZodEnum<{
        save: "save";
        invest: "invest";
    }>;
    annualReturnRate: z.ZodString;
    availability: z.ZodEnum<{
        available_now: "available_now";
        available_from: "available_from";
        long_term: "long_term";
    }>;
    availableFromMonth: z.ZodString;
    allocations: z.ZodArray<z.ZodObject<{
        goalId: z.ZodString;
        percentage: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const goalImpactSchema: z.ZodObject<{
    allocations: z.ZodArray<z.ZodObject<{
        goalId: z.ZodString;
        percentage: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const confirmGoalCreationSchema: z.ZodObject<{
    draft: z.ZodObject<{
        type: z.ZodEnum<{
            emergency_fund: "emergency_fund";
            purchase: "purchase";
            retirement: "retirement";
            other: "other";
        }>;
        name: z.ZodString;
        targetAmount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        desiredMonth: z.ZodString;
        priority: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        strategy: z.ZodEnum<{
            save: "save";
            invest: "invest";
        }>;
        annualReturnRate: z.ZodString;
        availability: z.ZodEnum<{
            available_now: "available_now";
            available_from: "available_from";
            long_term: "long_term";
        }>;
        availableFromMonth: z.ZodString;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    previewToken: z.ZodString;
}, z.core.$strip>;
type ConfirmGoalCreationInput = z.infer<typeof confirmGoalCreationSchema>;
declare const goalEditRequestSchema: z.ZodObject<{
    goalId: z.ZodString;
}, z.core.$strip>;
type GoalEditRequestInput = z.infer<typeof goalEditRequestSchema>;
declare const previewGoalEditSchema: z.ZodObject<{
    goalId: z.ZodString;
    draft: z.ZodObject<{
        type: z.ZodEnum<{
            emergency_fund: "emergency_fund";
            purchase: "purchase";
            retirement: "retirement";
            other: "other";
        }>;
        name: z.ZodString;
        targetAmount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        desiredMonth: z.ZodString;
        priority: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        strategy: z.ZodEnum<{
            save: "save";
            invest: "invest";
        }>;
        annualReturnRate: z.ZodString;
        availability: z.ZodEnum<{
            available_now: "available_now";
            available_from: "available_from";
            long_term: "long_term";
        }>;
        availableFromMonth: z.ZodString;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
type PreviewGoalEditInput = z.infer<typeof previewGoalEditSchema>;
declare const confirmGoalEditSchema: z.ZodObject<{
    goalId: z.ZodString;
    draft: z.ZodObject<{
        type: z.ZodEnum<{
            emergency_fund: "emergency_fund";
            purchase: "purchase";
            retirement: "retirement";
            other: "other";
        }>;
        name: z.ZodString;
        targetAmount: z.ZodString;
        currency: z.ZodEnum<{
            ARS: "ARS";
            USD: "USD";
        }>;
        desiredMonth: z.ZodString;
        priority: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        strategy: z.ZodEnum<{
            save: "save";
            invest: "invest";
        }>;
        annualReturnRate: z.ZodString;
        availability: z.ZodEnum<{
            available_now: "available_now";
            available_from: "available_from";
            long_term: "long_term";
        }>;
        availableFromMonth: z.ZodString;
        allocations: z.ZodArray<z.ZodObject<{
            goalId: z.ZodString;
            percentage: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    previewToken: z.ZodString;
}, z.core.$strip>;
type ConfirmGoalEditInput = z.infer<typeof confirmGoalEditSchema>;
declare function parseGoalCreationSubmission(input: unknown, currentMonth: string): GoalCreationDraft;

interface EligibleGoal {
    id: string;
    name: string;
    percentage: string | number;
}
interface SavingDraftInput {
    kind?: ContributionKind;
    currency: CurrencyCode;
    amount: string;
    place?: {
        kind: 'existing';
        placeId: string;
    } | {
        kind: 'new';
        name: string;
    };
    arsSpent?: string | null;
    effectiveRate?: string | null;
}
interface SavingDraft {
    kind?: ContributionKind;
    currency: CurrencyCode;
    amount: Money;
    place?: {
        kind: 'existing';
        placeId: string;
    } | {
        kind: 'new';
        name: string;
    };
    arsSpent?: Money;
    effectiveRate?: string;
}
interface SavingAllocationPreview {
    goalId: string;
    goalName: string;
    percentage: string;
    amount: Money;
    progressBefore?: string;
    progressAfter?: string;
    projectionBefore?: GoalProjection;
    projectionAfter?: GoalProjection;
}
interface SavingPreviewResult {
    draft: SavingDraft;
    allocations: SavingAllocationPreview[];
}
interface SavingContributionPreviewResult {
    preview: SavingPreviewResult;
    previewToken?: string;
}
type InvestmentContributionCurrencyState = {
    status: 'ready';
} | {
    status: 'incomplete';
    reason: 'missing_investment_position';
};
interface InvestmentContributionDataState {
    ars: InvestmentContributionCurrencyState;
    usd: InvestmentContributionCurrencyState;
}
interface PreviousMonthShortfall {
    kind: ContributionKind;
    currency: CurrencyCode;
    amount: Money;
}

export { type AllocationChangeConfirmation, AllocationChangeConfirmationSchema, type AllocationChangeContext, AllocationChangeContextSchema, type AllocationChangeContextState, AllocationChangeContextStateSchema, type AllocationChangeDraftWire, AllocationChangeDraftWireSchema, type AllocationChangePreview, type AllocationChangePreviewResult, AllocationChangePreviewSchema, AllocationChangeStaleSchema, AllocationChangeUpdatedSchema, ConfirmAllocationChangeWireSchema, ConfirmGoalCompletionWireSchema, type ConfirmGoalCreationInput, ConfirmGoalCreationWireSchema, type ConfirmGoalEditInput, ConfirmGoalLifecycleWireSchema, type ConfirmSavingContributionWire, ConfirmSavingContributionWireSchema, type ContributionAllocationSummary, ContributionIdPathWireSchema, type ContributionKind, type ContributionSummary, ContributionSummarySchema, type CreatePlaceholderItem, CreatePlaceholderItemSchema, CreateSavingsPlaceSchema, type DeletePlaceholderItemResponse, DeletePlaceholderItemResponseSchema, type EligibleGoal, type ExpenseDraft, ExpenseDraftSchema, ExpenseMutationResponseSchema, FIXED_INCOME_SOURCES, type FinancesWorkspace, FinancesWorkspaceSchema, type FinancialOnboardingInput, FinancialOnboardingResponseSchema, FinancialOnboardingSchema, GoalCompletionCompletedSchema, type GoalCompletionConfirmation, GoalCompletionConfirmationSchema, type GoalCompletionContext, GoalCompletionContextPresentSchema, GoalCompletionContextSchema, type GoalCompletionContextState, GoalCompletionContextStateSchema, GoalCompletionInvalidSchema, type GoalCompletionPreview, type GoalCompletionPreviewResult, GoalCompletionPreviewSchema, GoalCompletionPreviewWireSchema, GoalCompletionStaleSchema, type GoalCompletionWithdrawalSummary, type GoalCreationConfirmation, GoalCreationConfirmationSchema, type GoalCreationContext, GoalCreationContextMissingSchema, GoalCreationContextPresentSchema, type GoalCreationContextState, GoalCreationContextStateSchema, GoalCreationContextWireSchema, GoalCreationCreatedSchema, type GoalCreationDraft, type GoalCreationDraftWire, GoalCreationDraftWireSchema, type GoalCreationPreview, type GoalCreationPreviewResult, GoalCreationPreviewSchema, GoalCreationStaleSchema, GoalEditConfirmWireSchema, GoalEditConfirmationSchema, type GoalEditRequestInput, GoalEditStaleSchema, GoalEditUpdatedSchema, type GoalFundingRow, GoalIdPathWireSchema, GoalLifecycleActionSchema, type GoalLifecycleConfirmation, GoalLifecycleConfirmationSchema, type GoalLifecycleContext, GoalLifecycleContextSchema, type GoalLifecyclePreview, type GoalLifecyclePreviewResult, GoalLifecyclePreviewSchema, GoalLifecyclePreviewWireSchema, GoalLifecycleStaleSchema, GoalLifecycleUpdatedSchema, GoalPlanContextPresentSchema, GoalPlanContextStateSchema, GoalPlanEditContextWireSchema, GoalPlanQueryWireSchema, type GoalPriority, type GoalProjection, type GoalStatus, type GoalStrategy, type GoalWorkspaceItem, GoalWorkspaceItemSchema, type GoalsAppState, type GoalsFinancialSummary, type GoalsWorkspace, type GoalsWorkspaceData, GoalsWorkspaceMissingSchema, GoalsWorkspacePresentSchema, GoalsWorkspaceSchema, type HomeQuery, HomeQuerySchema, type HomeRoadmapMissing, HomeRoadmapMissingSchema, type HomeRoadmapPresent, HomeRoadmapPresentSchema, type HomeRoadmapResponse, HomeRoadmapResponseSchema, type IncomeDraft, IncomeDraftSchema, IncomeMutationResponseSchema, type InitialHomeState, InitialHomeStateSchema, type InvestmentAvailability, type InvestmentContributionCurrencyState, type InvestmentContributionDataState, type PlaceholderItem, type PlaceholderItemList, PlaceholderItemListSchema, PlaceholderItemSchema, type PlaceholderStatus, PlaceholderStatusSchema, type PreviewGoalEditInput, type PreviousMonthShortfall, type ProfileResponse, ProfileResponseSchema, RenameSavingsPlaceSchema, type RoadmapData, RoadmapDataSchema, type RoadmapExpense, RoadmapExpenseSchema, type RoadmapFinances, RoadmapFinancesSchema, type RoadmapIncome, RoadmapIncomeSchema, type RoadmapMonth, RoadmapMonthSchema, type SavingAllocationPreview, type SavingContributionConfirmation, SavingContributionConfirmationSchema, type SavingContributionContext, SavingContributionContextMissingSchema, SavingContributionContextPresentSchema, SavingContributionContextSchema, type SavingContributionContextState, SavingContributionContextStateSchema, SavingContributionCreatedSchema, SavingContributionDeletedSchema, type SavingContributionDraftWire, SavingContributionDraftWireSchema, type SavingContributionEditPreview, SavingContributionEditPreviewSchema, type SavingContributionPreview, type SavingContributionPreviewResult, SavingContributionPreviewSchema, SavingContributionStaleSchema, type SavingContributionSummary, SavingContributionUpdatedSchema, type SavingDraft, type SavingDraftInput, type SavingPreviewResult, SavingsPlaceIdParamsSchema, SavingsPlaceMutationResponseSchema, SavingsTransferResponseSchema, SavingsTransferSchema, type UpdatePlaceholderItem, UpdatePlaceholderItemSchema, type UpdateSavingContributionWire, UpdateSavingContributionWireSchema, type UsdPurchaseDerivation, type UsdPurchaseInput, allocationEntrySchema, confirmGoalCreationSchema, confirmGoalEditSchema, createObjectiveSchema, deriveUsdPurchase, goalCreationDraftSchema, goalEditRequestSchema, goalImpactSchema, goalPlanSchema, goalPrioritySchema, goalStrategySchema, goalTypeSchema, investmentAvailabilitySchema, isExpenseIncludedInMonth, isIncomeIncludedInMonth, parseGoalCreationSubmission, previewGoalEditSchema };
