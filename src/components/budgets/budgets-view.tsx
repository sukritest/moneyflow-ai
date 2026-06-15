"use client";

import * as React from "react";
import { Plus, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BudgetCard } from "@/components/budgets/budget-card";
import { BudgetForm } from "@/components/budgets/budget-form";
import { formatCurrency } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { BudgetWithProgress } from "@/lib/data/budgets";
import type { Category, Wallet, Budget } from "@prisma/client";

type BudgetsViewProps = {
  initialBudgets: BudgetWithProgress[];
  categories: Category[];
  wallets: Wallet[];
  defaultCurrency: string;
};

export function BudgetsView({ initialBudgets, categories, wallets, defaultCurrency }: BudgetsViewProps) {
  const { t } = useLocale();
  const [budgets, setBudgets] = React.useState(initialBudgets);
  const [loading, setLoading] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<Budget | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/budgets");
    if (res.ok) {
      const data = await res.json();
      setBudgets(data.budgets);
    }
    setLoading(false);
  }, []);

  function handleAdd() {
    setEditingBudget(null);
    setFormOpen(true);
  }

  function handleEdit(budget: BudgetWithProgress) {
    setEditingBudget(budget);
    setFormOpen(true);
  }

  async function handleDelete(budget: BudgetWithProgress) {
    if (!confirm(`Delete the "${budget.name}" budget?`)) return;
    const res = await fetch(`/api/budgets/${budget.id}`, { method: "DELETE" });
    if (res.ok) refresh();
  }

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPercent = totalBudgeted > 0 ? Math.min(100, Math.round((totalSpent / totalBudgeted) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("budgets.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {budgets.length} {budgets.length === 1 ? "budget" : "budgets"} · {overallPercent}% used overall
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("budgets.addBudget")}
        </Button>
      </div>

      {budgets.length > 0 && (
        <Card>
          <CardContent className="grid grid-cols-3 gap-4 p-4 sm:p-5">
            <div>
              <p className="text-xs text-muted-foreground">{t("budgets.ofBudget")}</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(totalBudgeted, defaultCurrency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("budgets.spent")}</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(totalSpent, defaultCurrency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("budgets.remaining")}</p>
              <p
                className={`text-lg font-bold tabular-nums ${
                  totalRemaining < 0 ? "text-destructive" : "text-success"
                }`}
              >
                {formatCurrency(totalRemaining, defaultCurrency)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PiggyBank className="h-6 w-6" />
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              {loading ? t("common.loading") : t("budgets.noBudgets")}
            </p>
            <Button onClick={handleAdd}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("budgets.addBudget")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              currency={defaultCurrency}
              onEdit={() => handleEdit(budget)}
              onDelete={() => handleDelete(budget)}
            />
          ))}
        </div>
      )}

      <BudgetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        wallets={wallets}
        budget={editingBudget}
        onSaved={refresh}
      />
    </div>
  );
}
