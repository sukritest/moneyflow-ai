"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/icon-map";
import type { CategorySpend } from "@/lib/data/dashboard";

type SpendingByCategoryChartProps = {
  title: string;
  data: CategorySpend[];
  currency: string;
  emptyLabel: string;
};

export function SpendingByCategoryChart({ title, data, currency, emptyLabel }: SpendingByCategoryChartProps) {
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const top = data.slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={top}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius="65%"
                    outerRadius="100%"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {top.map((entry) => (
                      <Cell key={entry.categoryId ?? entry.name} fill={entry.color} />
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
                <span className="text-lg font-bold">{formatCurrency(total, currency)}</span>
                <span className="text-[10px] text-muted-foreground">Total</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 w-full">
              {top.map((entry) => {
                const Icon = getCategoryIcon(entry.icon);
                return (
                  <div key={entry.categoryId ?? entry.name} className="flex items-center gap-2.5 text-sm">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${entry.color}1f`, color: entry.color }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1 truncate">{entry.name}</span>
                    <span className="font-medium">{formatCurrency(entry.amount, currency)}</span>
                    <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
                      {formatPercent(entry.amount / total, 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
