import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/icon-map";
import type { Category, Transaction, Wallet } from "@prisma/client";

type RecentTransactionsProps = {
  title: string;
  viewAllLabel: string;
  emptyLabel: string;
  transactions: (Transaction & { category: Category | null; wallet: Wallet })[];
};

export function RecentTransactions({ title, viewAllLabel, emptyLabel, transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/transactions">{viewAllLabel}</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          <div className="divide-y">
            {transactions.map((tx) => {
              const Icon = tx.type === "income" ? ArrowDownLeft : tx.type === "expense" ? getCategoryIcon(tx.category?.icon) : Receipt;
              const isIncome = tx.type === "income";
              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      isIncome ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    )}
                    style={
                      !isIncome && tx.category?.color
                        ? { backgroundColor: `${tx.category.color}1f`, color: tx.category.color }
                        : undefined
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {tx.merchant || tx.category?.name || (isIncome ? "Income" : "Expense")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tx.category?.name ?? tx.wallet.name} · {formatDate(tx.date)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      isIncome ? "text-success" : "text-foreground"
                    )}
                  >
                    {isIncome ? "+" : "-"}
                    {formatCurrency(tx.amount, tx.currency)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
