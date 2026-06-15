"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2, Save, Wallet2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { SalaryAllocationPlan } from "@prisma/client";

type SalaryPlannerViewProps = {
  initialPlan: SalaryAllocationPlan | null;
  currency: string;
};

const ALLOCATIONS = [
  { key: "savingsPct", labelKey: "salary.savings", color: "hsl(var(--success))" },
  { key: "investmentPct", labelKey: "salary.investment", color: "hsl(var(--primary))" },
  { key: "billsPct", labelKey: "salary.bills", color: "hsl(var(--warning))" },
  { key: "spendingPct", labelKey: "salary.spending", color: "hsl(var(--muted-foreground))" },
] as const;

export function SalaryPlannerView({ initialPlan, currency }: SalaryPlannerViewProps) {
  const { t } = useLocale();
  const [salaryAmount, setSalaryAmount] = React.useState(initialPlan?.salaryAmount ?? 0);
  const [pcts, setPcts] = React.useState({
    savingsPct: initialPlan?.savingsPct ?? 20,
    investmentPct: initialPlan?.investmentPct ?? 10,
    billsPct: initialPlan?.billsPct ?? 50,
    spendingPct: initialPlan?.spendingPct ?? 20,
  });
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const total = Object.values(pcts).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(total - 100) < 0.5 && salaryAmount > 0;

  function updatePct(key: keyof typeof pcts, value: number) {
    setSaved(false);
    setPcts((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, value)) }));
  }

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ai/salary-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaryAmount, ...pcts }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const chartData = ALLOCATIONS.map((a) => ({
    name: t(a.labelKey),
    value: pcts[a.key],
    amount: (salaryAmount * pcts[a.key]) / 100,
    color: a.color,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("salary.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("salary.subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("salary.setup")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="salaryAmount">{t("salary.monthlySalary")}</Label>
              <Input
                id="salaryAmount"
                type="number"
                min="0"
                step="100"
                value={salaryAmount}
                onChange={(e) => {
                  setSaved(false);
                  setSalaryAmount(Math.max(0, Number(e.target.value) || 0));
                }}
              />
            </div>

            <div className="space-y-3">
              {ALLOCATIONS.map((a) => (
                <div key={a.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={a.key} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                      {t(a.labelKey)}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency((salaryAmount * pcts[a.key]) / 100, currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id={a.key}
                      type="number"
                      min="0"
                      max="100"
                      value={pcts[a.key]}
                      onChange={(e) => updatePct(a.key, Number(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={`text-sm font-medium ${Math.abs(total - 100) < 0.5 ? "text-success" : "text-destructive"}`}>
              {t("salary.total")}: {total.toFixed(0)}% {Math.abs(total - 100) >= 0.5 && `(${t("salary.mustEqual100")})`}
            </div>

            <Button onClick={handleSave} disabled={!isValid || saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              {saved ? t("salary.saved") : t("common.save")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("salary.breakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            {salaryAmount <= 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <Wallet2 className="h-8 w-8" />
                {t("salary.enterSalary")}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="amount" nameKey="name" innerRadius="65%" outerRadius="100%" paddingAngle={2} strokeWidth={0}>
                        {chartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value, currency)}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid hsl(var(--border))",
                          backgroundColor: "hsl(var(--popover))",
                          color: "hsl(var(--popover-foreground))",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">{formatCurrency(salaryAmount, currency)}</span>
                    <span className="text-[10px] text-muted-foreground">{t("salary.monthlySalary")}</span>
                  </div>
                </div>
                <div className="flex-1 w-full space-y-2">
                  {chartData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2.5 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="flex-1 truncate">{entry.name}</span>
                      <span className="font-medium">{formatCurrency(entry.amount, currency)}</span>
                      <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">{entry.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
