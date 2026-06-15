"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2, Calculator, PlusCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GoalSimulator } from "@/components/goals/goal-simulator";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/icon-map";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Goal } from "@prisma/client";

const TYPE_ICONS: Record<string, string> = {
  saving: "piggy-bank",
  emergency_fund: "shield",
  travel: "plane",
  car: "car",
  house: "home",
  custom: "target",
};

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

type GoalCardProps = {
  goal: Goal;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => void;
};

export function GoalCard({ goal, currency, onEdit, onDelete, onChanged }: GoalCardProps) {
  const { t } = useLocale();
  const [showSimulator, setShowSimulator] = React.useState(false);
  const [contribution, setContribution] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const Icon = getCategoryIcon(TYPE_ICONS[goal.type] ?? goal.icon);
  const percent = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
  const isCompleted = goal.status === "completed" || percent >= 100;

  async function handleContribute() {
    const amount = Number(contribution);
    if (!amount || amount <= 0) return;
    setSubmitting(true);
    const res = await fetch(`/api/goals/${goal.id}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    setSubmitting(false);
    if (res.ok) {
      setContribution("");
      onChanged();
    }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{goal.name}</p>
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
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={PRIORITY_VARIANT[goal.priority] ?? "default"} className="text-[10px]">
                {t(`goals.${goal.priority}`)}
              </Badge>
              {goal.targetDate && <span>{t("goals.targetDate")}: {formatDate(goal.targetDate)}</span>}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-lg font-bold tabular-nums">{formatCurrency(goal.currentAmount, currency)}</span>
            <span className="text-sm text-muted-foreground">
              {t("budgets.ofBudget")} {formatCurrency(goal.targetAmount, currency)}
            </span>
          </div>
          <Progress value={percent} indicatorClassName={isCompleted ? "bg-success" : "bg-primary"} />
          <div className="flex items-center justify-between text-xs">
            <span className={cn("font-medium", isCompleted ? "text-success" : "text-muted-foreground")}>
              {isCompleted ? t("goals.goalReached") : `${percent}% ${t("goals.progress").toLowerCase()}`}
            </span>
          </div>
        </div>

        {!isCompleted && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 gap-2">
              <Input
                type="number"
                min="0"
                step="100"
                placeholder={t("goals.monthlyAmount")}
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                className="h-9"
              />
              <Button size="sm" onClick={handleContribute} disabled={submitting || !contribution}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                <span className="ml-1.5 hidden sm:inline">{t("goals.contribute")}</span>
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowSimulator((v) => !v)}>
              <Calculator className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">{t("goals.simulator")}</span>
            </Button>
          </div>
        )}

        {showSimulator && !isCompleted && (
          <div className="mt-3">
            <GoalSimulator
              targetAmount={goal.targetAmount}
              currentAmount={goal.currentAmount}
              currency={currency}
              initialMonthly={goal.monthlyContribution}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
