import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: number;
  currency: string;
  icon: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  /** When true, a positive delta is shown in the destructive color (e.g. expenses going up is bad) */
  invertDelta?: boolean;
  iconClassName?: string;
  formatAsPercent?: boolean;
};

export function StatCard({
  label,
  value,
  currency,
  icon: Icon,
  delta,
  deltaLabel,
  invertDelta,
  iconClassName,
  formatAsPercent,
}: StatCardProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const isPositive = (delta ?? 0) >= 0;
  const showAsGood = invertDelta ? !isPositive : isPositive;

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">
            {formatAsPercent ? `${value.toFixed(1)}%` : formatCurrency(value, currency)}
          </p>
          {hasDelta && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                showAsGood ? "text-success" : "text-destructive"
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              <span>{Math.abs(delta!).toFixed(1)}%</span>
              {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
            </div>
          )}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary", iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
