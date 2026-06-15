"use client";

import * as React from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { FinancialHealthScore } from "@prisma/client";

type HealthScoreCardProps = {
  score: FinancialHealthScore | null;
  onRecompute: () => Promise<void>;
};

const SUB_SCORES: { key: keyof FinancialHealthScore; labelKey: string }[] = [
  { key: "savingsRateScore", labelKey: "insights.savingsRateScore" },
  { key: "emergencyFundScore", labelKey: "insights.emergencyFundScore" },
  { key: "budgetAdherenceScore", labelKey: "insights.budgetAdherenceScore" },
  { key: "debtRatioScore", labelKey: "insights.debtRatioScore" },
  { key: "spendingConsistencyScore", labelKey: "insights.spendingConsistencyScore" },
];

function scoreColor(score: number) {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

function scoreIndicator(score: number) {
  if (score >= 75) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

function scoreLabel(score: number, t: (key: string) => string) {
  if (score >= 85) return t("insights.excellent");
  if (score >= 70) return t("insights.good");
  if (score >= 50) return t("insights.fair");
  return t("insights.needsAttention");
}

export function HealthScoreCard({ score, onRecompute }: HealthScoreCardProps) {
  const { t } = useLocale();
  const [loading, setLoading] = React.useState(false);

  async function handleRecompute() {
    setLoading(true);
    try {
      await onRecompute();
    } finally {
      setLoading(false);
    }
  }

  if (!score) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("insights.noScore")}</p>
          <Button onClick={handleRecompute} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("insights.computeScore")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{t("insights.healthScore")}</CardTitle>
        <Button variant="outline" size="sm" onClick={handleRecompute} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-1.5 hidden sm:inline">{t("insights.recompute")}</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <div className={cn("text-5xl font-bold tabular-nums", scoreColor(score.score))}>{score.score}</div>
          <div>
            <p className={cn("text-sm font-semibold", scoreColor(score.score))}>{scoreLabel(score.score, t)}</p>
            <p className="text-xs text-muted-foreground">{t("insights.outOf100")}</p>
          </div>
        </div>

        <div className="space-y-3">
          {SUB_SCORES.map(({ key, labelKey }) => {
            const value = score[key] as number;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t(labelKey)}</span>
                  <span className="font-medium tabular-nums">{value}</span>
                </div>
                <Progress value={value} indicatorClassName={scoreIndicator(value)} className="h-1.5" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
