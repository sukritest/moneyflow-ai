"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-provider";

type GoalSimulatorProps = {
  targetAmount: number;
  currentAmount: number;
  currency: string;
  initialMonthly?: number | null;
};

export function GoalSimulator({ targetAmount, currentAmount, currency, initialMonthly }: GoalSimulatorProps) {
  const { t } = useLocale();
  const remaining = Math.max(0, targetAmount - currentAmount);
  const [monthly, setMonthly] = React.useState<number>(initialMonthly && initialMonthly > 0 ? initialMonthly : Math.max(1, Math.round(remaining / 12)));

  const monthsToGoal = monthly > 0 ? Math.ceil(remaining / monthly) : Infinity;

  const targetDate = React.useMemo(() => {
    if (!Number.isFinite(monthsToGoal)) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToGoal);
    return d;
  }, [monthsToGoal]);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{t("goals.simulatorHint")}</p>

      <div className="space-y-1.5">
        <Label htmlFor="sim-monthly" className="text-xs">
          {t("goals.monthlyAmount")}
        </Label>
        <Input
          id="sim-monthly"
          type="number"
          min="0"
          step="100"
          value={monthly}
          onChange={(e) => setMonthly(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{t("goals.monthsToGoal")}</p>
          <p className="font-semibold tabular-nums">
            {remaining <= 0
              ? t("goals.goalReached")
              : Number.isFinite(monthsToGoal)
                ? monthsToGoal
                : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Estimated date</p>
          <p className="font-semibold tabular-nums">
            {remaining <= 0 || !targetDate
              ? "—"
              : targetDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {formatCurrency(remaining, currency)} remaining at {formatCurrency(monthly, currency)}/month
      </p>
    </div>
  );
}
