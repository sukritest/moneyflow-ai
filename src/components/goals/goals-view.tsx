"use client";

import * as React from "react";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalForm } from "@/components/goals/goal-form";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Goal } from "@prisma/client";

type GoalsViewProps = {
  initialGoals: Goal[];
  defaultCurrency: string;
};

export function GoalsView({ initialGoals, defaultCurrency }: GoalsViewProps) {
  const { t } = useLocale();
  const [goals, setGoals] = React.useState(initialGoals);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<Goal | null>(null);

  const refresh = React.useCallback(async () => {
    const res = await fetch("/api/goals");
    if (res.ok) {
      const data = await res.json();
      setGoals(data.goals);
    }
  }, []);

  function handleAdd() {
    setEditingGoal(null);
    setFormOpen(true);
  }

  function handleEdit(goal: Goal) {
    setEditingGoal(goal);
    setFormOpen(true);
  }

  async function handleDelete(goal: Goal) {
    if (!confirm(`Delete the "${goal.name}" goal?`)) return;
    const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    if (res.ok) refresh();
  }

  const activeGoals = goals.filter((g) => g.status !== "completed" && g.status !== "cancelled");
  const otherGoals = goals.filter((g) => g.status === "completed" || g.status === "cancelled");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("goals.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {activeGoals.length} active · {otherGoals.length} completed
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("goals.addGoal")}
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Target className="h-6 w-6" />
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">{t("goals.noGoals")}</p>
            <Button onClick={handleAdd}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("goals.addGoal")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...activeGoals, ...otherGoals].map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={defaultCurrency}
              onEdit={() => handleEdit(goal)}
              onDelete={() => handleDelete(goal)}
              onChanged={refresh}
            />
          ))}
        </div>
      )}

      <GoalForm open={formOpen} onOpenChange={setFormOpen} goal={editingGoal} onSaved={refresh} />
    </div>
  );
}
