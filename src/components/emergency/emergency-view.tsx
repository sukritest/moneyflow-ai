"use client";

import * as React from "react";
import { ShieldAlert, ShieldCheck, Loader2, CalendarClock, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { EmergencyPlan } from "@prisma/client";

type SurvivalBudgetEntry = { current: number; survival: number; essential: boolean };
type PriorityPayment = { title: string; amount: number; dueDate: string; type: string };

type EmergencyViewProps = {
  initialPlan: EmergencyPlan | null;
  currency: string;
};

function runwayColor(days: number) {
  if (days >= 90) return "text-success";
  if (days >= 30) return "text-warning";
  return "text-destructive";
}

export function EmergencyView({ initialPlan, currency }: EmergencyViewProps) {
  const { t, locale } = useLocale();
  const [plan, setPlan] = React.useState(initialPlan);
  const [loading, setLoading] = React.useState(false);

  async function handleActivate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/emergency", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve() {
    if (!plan) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/emergency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: plan.id }),
      });
      if (res.ok) setPlan(null);
    } finally {
      setLoading(false);
    }
  }

  if (!plan) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("emergency.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("emergency.subtitle")}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <p className="max-w-md text-sm text-muted-foreground">{t("emergency.intro")}</p>
            <Button onClick={handleActivate} disabled={loading} variant="destructive">
              {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("emergency.activate")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const survivalBudget: Record<string, SurvivalBudgetEntry> = JSON.parse(plan.survivalBudget || "{}");
  const reductionPlan: string[] = JSON.parse(plan.reductionPlan || "[]");
  const priorityPayments: PriorityPayment[] = JSON.parse(plan.priorityPayments || "[]");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("emergency.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("emergency.activeSince")} {formatDate(plan.triggeredAt, locale)}</p>
        </div>
        <Button onClick={handleResolve} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />}
          {t("emergency.resolve")}
        </Button>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-bold", runwayColor(plan.cashRunwayDays))}>
            {plan.cashRunwayDays}
          </div>
          <div>
            <p className="text-sm font-semibold">{t("emergency.cashRunway")}</p>
            <p className="text-xs text-muted-foreground">{t("emergency.cashRunwayHint")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("emergency.survivalBudget")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(survivalBudget).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emergency.noBudgetData")}</p>
            ) : (
              Object.entries(survivalBudget).map(([name, entry]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{name}</span>
                    {entry.essential && (
                      <Badge variant="secondary" className="text-[10px]">
                        {t("emergency.essential")}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    {entry.essential ? (
                      <span className="font-medium">{formatCurrency(entry.survival, currency)}</span>
                    ) : (
                      <span>
                        <span className="text-muted-foreground line-through">{formatCurrency(entry.current, currency)}</span>{" "}
                        <span className="font-medium text-success">{formatCurrency(entry.survival, currency)}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4" />
              {t("emergency.reductionPlan")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {reductionPlan.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              {t("emergency.priorityPayments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {priorityPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emergency.noUpcomingPayments")}</p>
            ) : (
              <div className="space-y-2">
                {priorityPayments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.dueDate, locale)}</p>
                    </div>
                    <span className="font-medium">{formatCurrency(p.amount, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
