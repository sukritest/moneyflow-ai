import type { Metadata } from "next";
import { Wallet, TrendingDown, TrendingUp, PiggyBank } from "lucide-react";
import { getActiveUser } from "@/lib/auth";
import { getDictionary, translate } from "@/lib/i18n/get-dictionary";
import {
  getDashboardSummary,
  getSpendingByCategory,
  getMonthlyTrend,
  getRecentTransactions,
  getLatestHealthScore,
} from "@/lib/data/dashboard";
import { StatCard } from "@/components/dashboard/stat-card";
import { HealthScoreCard } from "@/components/dashboard/health-score-card";
import { MonthlyTrendChart } from "@/components/dashboard/monthly-trend-chart";
import { SpendingByCategoryChart } from "@/components/dashboard/spending-by-category-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";

export const metadata: Metadata = {
  title: "Dashboard — MoneyFlow AI",
};

export default async function DashboardPage() {
  const user = await getActiveUser();
  const dict = getDictionary(user.locale);
  const t = (key: string) => translate(dict, key);

  const [summary, spendingByCategory, monthlyTrend, recentTransactions, healthScore] = await Promise.all([
    getDashboardSummary(user.id),
    getSpendingByCategory(user.id),
    getMonthlyTrend(user.id, 6),
    getRecentTransactions(user.id, 5),
    getLatestHealthScore(user.id),
  ]);

  const breakdown = healthScore
    ? [
        { label: "Savings rate", value: healthScore.savingsRateScore },
        { label: "Budget adherence", value: healthScore.budgetAdherenceScore },
        { label: "Emergency fund", value: healthScore.emergencyFundScore },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user.name?.split(" ")[0] ?? "there"} 👋
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("dashboard.totalIncome")}
          value={summary.income}
          currency={user.currency}
          icon={TrendingUp}
          delta={summary.incomeDelta}
          deltaLabel={t("dashboard.vsLastMonth")}
        />
        <StatCard
          label={t("dashboard.totalExpenses")}
          value={summary.expenses}
          currency={user.currency}
          icon={TrendingDown}
          delta={summary.expensesDelta}
          deltaLabel={t("dashboard.vsLastMonth")}
          invertDelta
        />
        <StatCard
          label={t("dashboard.balance")}
          value={summary.balance}
          currency={user.currency}
          icon={Wallet}
        />
        <StatCard
          label={t("dashboard.savingsRate")}
          value={summary.savingsRate}
          currency={user.currency}
          icon={PiggyBank}
          formatAsPercent
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthlyTrendChart
            title={t("dashboard.monthlyComparison")}
            data={monthlyTrend}
            currency={user.currency}
            incomeLabel={t("transactions.income")}
            expenseLabel={t("transactions.expense")}
          />
        </div>
        <HealthScoreCard score={healthScore?.score ?? null} title={t("dashboard.healthScore")} breakdown={breakdown} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingByCategoryChart
          title={t("dashboard.spendingTrends")}
          data={spendingByCategory}
          currency={user.currency}
          emptyLabel="No expenses recorded this month yet."
        />
        <RecentTransactions
          title={t("dashboard.recentTransactions")}
          viewAllLabel={t("common.viewAll")}
          emptyLabel="No transactions yet. Add your first one to get started."
          transactions={recentTransactions}
        />
      </div>
    </div>
  );
}
