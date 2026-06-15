"use client";

import { MoreHorizontal, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatCurrency } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/icon-map";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BudgetWithProgress } from "@/lib/data/budgets";

type BudgetCardProps = {
  budget: BudgetWithProgress;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
};

export function BudgetCard({ budget, currency, onEdit, onDelete }: BudgetCardProps) {
  const { t } = useLocale();
  const Icon = getCategoryIcon(budget.category?.icon);
  const percent = Math.min(100, Math.round(budget.percentUsed * 100));
  const isOver = budget.percentUsed >= 1;
  const isNear = !isOver && budget.percentUsed >= budget.alertThreshold;

  const indicatorClassName = isOver ? "bg-destructive" : isNear ? "bg-warning" : "bg-success";

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: `${budget.category?.color ?? "#6366f1"}1f`,
              color: budget.category?.color ?? "#6366f1",
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{budget.name}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-xs text-muted-foreground">
              {budget.category?.name ?? t("budgets.allCategories")} · {t(`budgets.${budget.period}`)}
              {budget.wallet ? ` · ${budget.wallet.name}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-lg font-bold tabular-nums">{formatCurrency(budget.spent, currency)}</span>
            <span className="text-sm text-muted-foreground">
              {t("budgets.ofBudget")} {formatCurrency(budget.amount, currency)}
            </span>
          </div>
          <Progress value={percent} indicatorClassName={indicatorClassName} />
          <div className="flex items-center justify-between text-xs">
            <span
              className={cn(
                "flex items-center gap-1 font-medium",
                isOver ? "text-destructive" : isNear ? "text-warning" : "text-success"
              )}
            >
              {(isOver || isNear) && <AlertTriangle className="h-3.5 w-3.5" />}
              {isOver ? t("budgets.overBudget") : isNear ? t("budgets.nearLimit") : t("budgets.onTrack")}
            </span>
            <span className="text-muted-foreground">
              {budget.remaining >= 0
                ? `${formatCurrency(budget.remaining, currency)} ${t("budgets.remaining")}`
                : `${formatCurrency(Math.abs(budget.remaining), currency)} over`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
