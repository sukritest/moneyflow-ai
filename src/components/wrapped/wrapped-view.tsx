"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Share2,
  Check,
  TrendingUp,
  TrendingDown,
  Trophy,
  Tag,
  Store,
  Sparkles,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { MonthlyWrapped } from "@prisma/client";
import { addMonths, startOfMonth, subMonths } from "date-fns";

type WrappedViewProps = {
  initialWrapped: MonthlyWrapped;
  initialHistory: Date[];
  currency: string;
};

export function WrappedView({ initialWrapped, initialHistory, currency }: WrappedViewProps) {
  const { locale, t } = useLocale();
  const [wrapped, setWrapped] = React.useState(initialWrapped);
  const [history] = React.useState(initialHistory);
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const month = new Date(wrapped.month);
  const now = new Date();
  const canGoForward = startOfMonth(addMonths(month, 1)) < startOfMonth(now);

  async function loadMonth(targetMonth: Date, regenerate = false) {
    setLoading(true);
    setCopied(false);
    try {
      if (regenerate) {
        const res = await fetch("/api/wrapped", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month: targetMonth.toISOString() }),
        });
        if (res.ok) {
          const data = await res.json();
          setWrapped(data.wrapped);
        }
      } else {
        const res = await fetch(`/api/wrapped?month=${targetMonth.toISOString()}`);
        if (res.ok) {
          const data = await res.json();
          setWrapped(data.wrapped);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/wrapped/share/${wrapped.shareSlug ?? wrapped.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — ignore silently
    }
  }

  const netPositive = wrapped.netSavings >= 0;
  const savingsRate = wrapped.totalIncome > 0 ? wrapped.netSavings / wrapped.totalIncome : 0;
  const hasActivity = wrapped.totalIncome > 0 || wrapped.totalExpense > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("wrapped.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("wrapped.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => loadMonth(subMonths(month, 1))} disabled={loading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[9rem] text-center text-sm font-medium">
            {formatDate(month, locale, { year: "numeric", month: "long" })}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadMonth(addMonths(month, 1))}
            disabled={loading || !canGoForward}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-none bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 text-white shadow-xl">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-white/80">
              <Sparkles className="h-4 w-4" />
              {t("wrapped.monthInReview")}
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
              <Trophy className="h-4 w-4" />
              {wrapped.score}/100
            </div>
          </div>

          <div>
            <p className="text-3xl font-bold sm:text-4xl">
              {formatDate(month, locale, { year: "numeric", month: "long" })}
            </p>
            <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">{wrapped.savingsAchievement}</p>
          </div>

          {hasActivity ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {t("wrapped.totalIncome")}
                  </div>
                  <p className="mt-1 text-xl font-semibold sm:text-2xl">
                    {formatCurrency(wrapped.totalIncome, currency, locale)}
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
                    <TrendingDown className="h-3.5 w-3.5" />
                    {t("wrapped.totalExpenses")}
                  </div>
                  <p className="mt-1 text-xl font-semibold sm:text-2xl">
                    {formatCurrency(wrapped.totalExpense, currency, locale)}
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
                    {netPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {t("wrapped.netSavings")}
                  </div>
                  <p className="mt-1 text-xl font-semibold sm:text-2xl">
                    {formatCurrency(wrapped.netSavings, currency, locale)}
                  </p>
                  <p className="text-xs text-white/70">{Math.round(savingsRate * 100)}% {t("wrapped.savingsRate")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4">
                  <Tag className="h-5 w-5 shrink-0 text-white/80" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">{t("wrapped.topCategory")}</p>
                    <p className="font-medium">{wrapped.topCategory ?? t("wrapped.noData")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4">
                  <Store className="h-5 w-5 shrink-0 text-white/80" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">{t("wrapped.topMerchant")}</p>
                    <p className="font-medium">{wrapped.topMerchant ?? t("wrapped.noData")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4">
                  <Receipt className="h-5 w-5 shrink-0 text-white/80" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">{t("wrapped.biggestExpense")}</p>
                    <p className="font-medium">
                      {wrapped.biggestExpense != null
                        ? formatCurrency(wrapped.biggestExpense, currency, locale)
                        : t("wrapped.noData")}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-white/10 p-4 text-sm text-white/90">{t("wrapped.empty")}</div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="secondary"
              className="bg-white/15 text-white hover:bg-white/25"
              onClick={() => loadMonth(month, true)}
              disabled={loading}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              {t("wrapped.regenerate")}
            </Button>
            <Button
              variant="secondary"
              className="bg-white/15 text-white hover:bg-white/25"
              onClick={handleShare}
            >
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
              {copied ? t("wrapped.copied") : t("wrapped.share")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {history.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">{t("wrapped.pastMonths")}</p>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => {
              const d = new Date(h);
              const isActive = startOfMonth(d).getTime() === startOfMonth(month).getTime();
              return (
                <Button
                  key={d.toISOString()}
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => loadMonth(d)}
                  disabled={loading}
                >
                  {formatDate(d, locale, { year: "numeric", month: "short" })}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
