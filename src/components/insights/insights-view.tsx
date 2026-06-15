"use client";

import * as React from "react";
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, Info, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthScoreCard } from "@/components/insights/health-score-card";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Insight, FinancialHealthScore } from "@prisma/client";

type InsightsViewProps = {
  initialInsights: Insight[];
  initialScore: FinancialHealthScore | null;
  aiEnabled: boolean;
};

const SEVERITY_CONFIG: Record<string, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "text-primary bg-primary/10" },
  warning: { icon: AlertTriangle, className: "text-warning bg-warning/10" },
  critical: { icon: AlertTriangle, className: "text-destructive bg-destructive/10" },
  positive: { icon: TrendingUp, className: "text-success bg-success/10" },
};

const TYPE_ICON: Record<string, typeof Lightbulb> = {
  money_leak: AlertTriangle,
  monthly: Sparkles,
  weekly: Sparkles,
  daily: Sparkles,
  tip: Lightbulb,
  forecast: TrendingUp,
};

export function InsightsView({ initialInsights, initialScore, aiEnabled }: InsightsViewProps) {
  const { t, locale } = useLocale();
  const [insights, setInsights] = React.useState(initialInsights);
  const [score, setScore] = React.useState(initialScore);
  const [generating, setGenerating] = React.useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/insights", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleMarkRead(id: string) {
    setInsights((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
    await fetch(`/api/ai/insights/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: true }),
    });
  }

  async function handleRecomputeScore() {
    const res = await fetch("/api/ai/health-score", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setScore(data.score);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("insights.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("insights.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {!aiEnabled && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("chat.mockMode")}
            </Badge>
          )}
          <Button onClick={handleGenerate} disabled={generating} size="sm">
            {generating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
            {t("insights.generate")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed">{t("insights.feed")}</TabsTrigger>
          <TabsTrigger value="health">{t("insights.healthScore")}</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-3">
          {insights.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="max-w-sm text-sm text-muted-foreground">{t("insights.noInsights")}</p>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("insights.generate")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            insights.map((insight) => {
              const severity = SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG.info;
              const TypeIcon = TYPE_ICON[insight.type] ?? Lightbulb;
              const SeverityIcon = severity.icon;
              return (
                <Card
                  key={insight.id}
                  className={cn(!insight.isRead && "border-primary/40")}
                  onClick={() => !insight.isRead && handleMarkRead(insight.id)}
                >
                  <CardContent className="flex gap-3 p-4">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", severity.className)}>
                      <SeverityIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-semibold">
                          <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {insight.title}
                        </p>
                        {!insight.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.body}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(insight.createdAt, locale)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="health">
          <HealthScoreCard score={score} onRecompute={handleRecomputeScore} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
