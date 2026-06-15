import { HeartPulse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HealthScoreCardProps = {
  score: number | null;
  title: string;
  breakdown?: { label: string; value: number }[];
};

function getScoreColor(score: number) {
  if (score >= 75) return "text-success stroke-success";
  if (score >= 50) return "text-warning stroke-warning";
  return "text-destructive stroke-destructive";
}

function getScoreLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Needs attention";
}

export function HealthScoreCard({ score, title, breakdown = [] }: HealthScoreCardProps) {
  const value = score ?? 0;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (value / 100) * circumference;
  const colorClass = getScoreColor(value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartPulse className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" strokeWidth="8" className="stroke-muted" />
            {score !== null && (
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={cn("transition-all duration-700", colorClass)}
              />
            )}
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-bold">{score !== null ? Math.round(value) : "–"}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {score !== null ? (
            <>
              <p className={cn("text-sm font-semibold", colorClass)}>{getScoreLabel(value)}</p>
              {breakdown.slice(0, 3).map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{Math.round(item.value)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add a few transactions to calculate your financial health score.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
