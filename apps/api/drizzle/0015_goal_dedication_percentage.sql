ALTER TABLE "financial_profiles" ADD COLUMN "goal_dedication_percentage" numeric(5, 2);--> statement-breakpoint
WITH current_month AS (
  SELECT date_trunc('month', CURRENT_DATE)::date AS month
), income_totals AS (
  SELECT i.user_id,
    SUM(CASE WHEN i.currency = 'USD' THEN i.amount * 1500 ELSE i.amount END) AS amount
  FROM incomes i, current_month m
  WHERE (i.recurring AND i.effective_month <= m.month)
     OR (NOT i.recurring AND i.effective_month = m.month)
  GROUP BY i.user_id
), expense_totals AS (
  SELECT e.user_id,
    SUM(CASE WHEN e.currency = 'USD' THEN e.amount * 1500 ELSE e.amount END) AS amount
  FROM expenses e, current_month m
  WHERE (e.recurring AND e.effective_month <= m.month AND (e.end_month IS NULL OR m.month < e.end_month))
     OR (NOT e.recurring AND e.effective_month = m.month)
  GROUP BY e.user_id
), balances AS (
  SELECT p.user_id,
    GREATEST(COALESCE(i.amount, 0) - COALESCE(e.amount, 0), 0) AS amount
  FROM financial_profiles p
  LEFT JOIN income_totals i ON i.user_id = p.user_id
  LEFT JOIN expense_totals e ON e.user_id = p.user_id
)
UPDATE financial_profiles p
SET goal_dedication_percentage = CASE
  WHEN b.amount > 0 AND p.planned_monthly_contribution IS NOT NULL
  THEN LEAST(100, GREATEST(0, ROUND(
    p.planned_monthly_contribution / b.amount * 100
  )))
  ELSE 90
END
FROM balances b
WHERE b.user_id = p.user_id;--> statement-breakpoint
ALTER TABLE "financial_profiles" ALTER COLUMN "goal_dedication_percentage" SET DEFAULT '90.00';--> statement-breakpoint
ALTER TABLE "financial_profiles" ALTER COLUMN "goal_dedication_percentage" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD CONSTRAINT "financial_profiles_goal_dedication_percentage_check" CHECK ("financial_profiles"."goal_dedication_percentage" between 0 and 100);