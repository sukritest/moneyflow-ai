"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { RefreshCw, Loader2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { CashflowForecast } from "@prisma/client";

type ForecastViewProps = {
  initialForecasts: CashflowForecast[];
  currency: string;
};

const SCENARIOS = ["baseline", "optimistic", "pessimistic"] as const;

export function ForecastView({ initialForecasts, currency }: ForecastViewProps) {
  const { t, locale } = useLocale();
  const [scenario, setScenario] = React.useState<string>("baseline");
  const [forecasts, setForecasts] = React.useState(initialForecasts);
  const [loading, setLoading] = React.useState(false);

  async function loadScenario(next: string) {
    setScenario(next);
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/forecast?scenario=${next}`);
      if (res.ok) {
        const data = await res.json();
        setForecasts(data.forecasts);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      if (res.ok) {
        const data = await res.json();
        setForecasts(data.forecasts);
      }
    } finally {
      setLoading(false);
    }
  }

  const chartData = forecasts.map((f) => ({
    label: new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { month: "short", year: "2-digit" }).format(
      new Date(f.forMonth)
    ),
    income: f.predictedIncome,
    expense: f.predictedExpense,
    balance: f.predictedBalance,
  }));

  const lastBalance = forecasts.at(-1)?.predictedBalance ?? 0;
  const firstBalance = forecasts[0]?.predictedBalance ?? 0;
  const trendingUp = lastBalance >= firstBalance;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("forecast.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("forecast.subtitle")}</p>
        </div>
        <Button onClick={handleRegenerate} disabled={loading} size="sm">
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
          {t("forecast.regenerate")}
        </Button>
      </div>

      <div className="flex gap-2">
        {SCENARIOS.map((s) => (
          <Button
            key={s}
            variant={scenario === s ? "default" : "outline"}
            size="sm"
            onClick={() => loadScenario(s)}
            disabled={loading}
          >
            {t(`forecast.${s}`)}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{t("forecast.projectedBalance")}</CardTitle>
          <div className={cn("flex items-center gap-1 text-sm font-semibold", trendingUp ? "text-success" : "text-destructive")}>
            {trendingUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {formatCurrency(lastBalance, currency)}
          </div>
        </CardHeader>
        <CardContent className="h-72 px-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => formatNumber(v)} width={48} />
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name={t("dashboard.income")} fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name={t("dashboard.expenses")} fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              <Line dataKey="balance" name={t("forecast.balance")} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {forecasts.map((f) => (
          <Card key={f.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                {new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { month: "long", year: "numeric" }).format(
                  new Date(f.forMonth)
                )}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("dashboard.income")}</span>
                  <span className="font-medium text-success">{formatCurrency(f.predictedIncome, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("dashboard.expenses")}</span>
                  <span className="font-medium text-destructive">{formatCurrency(f.predictedExpense, currency)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-muted-foreground">{t("forecast.balance")}</span>
                  <span className="font-semibold">{formatCurrency(f.predictedBalance, currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
