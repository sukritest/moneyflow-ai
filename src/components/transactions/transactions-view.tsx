"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/icon-map";
import { useLocale } from "@/lib/i18n/locale-provider";
import { TransactionForm } from "@/components/transactions/transaction-form";
import type { Category, Wallet, Transaction, TransactionTag, Tag } from "@prisma/client";

type TransactionWithRelations = Transaction & {
  category: Category | null;
  wallet: Wallet;
  tags: (TransactionTag & { tag: Tag })[];
};

type TransactionsViewProps = {
  initialTransactions: TransactionWithRelations[];
  initialTotal: number;
  initialTotalPages: number;
  categories: Category[];
  wallets: Wallet[];
  defaultCurrency: string;
};

const PAGE_SIZE = 20;

export function TransactionsView({
  initialTransactions,
  initialTotal,
  initialTotalPages,
  categories,
  wallets,
  defaultCurrency,
}: TransactionsViewProps) {
  const { t } = useLocale();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = React.useState(initialTransactions);
  const [total, setTotal] = React.useState(initialTotal);
  const [totalPages, setTotalPages] = React.useState(initialTotalPages);
  const [loading, setLoading] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(searchParams.get("new") === "1");
  const [editingTransaction, setEditingTransaction] = React.useState<TransactionWithRelations | null>(null);

  const fetchTransactions = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));

    const res = await fetch(`/api/transactions?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [search, typeFilter, categoryFilter, page]);

  React.useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, categoryFilter, page]);

  function handleAdd() {
    setEditingTransaction(null);
    setFormOpen(true);
  }

  function handleEdit(tx: TransactionWithRelations) {
    setEditingTransaction(tx);
    setFormOpen(true);
  }

  async function handleDelete(tx: TransactionWithRelations) {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    const res = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
    if (res.ok) {
      fetchTransactions();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("transactions.title")}</h1>
          <p className="text-sm text-muted-foreground">{total} transactions</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("transactions.addTransaction")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("transactions.search")}
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setPage(1);
            setTypeFilter(v);
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="income">{t("transactions.income")}</SelectItem>
            <SelectItem value="expense">{t("transactions.expense")}</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setPage(1);
            setCategoryFilter(v);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder={t("transactions.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              {loading ? t("common.loading") : "No transactions found."}
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => {
                const isIncome = tx.type === "income";
                const Icon = isIncome ? ArrowDownLeft : getCategoryIcon(tx.category?.icon);
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
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
                        {tx.merchant || tx.category?.name || (isIncome ? "Income" : tx.type === "transfer" ? "Transfer" : "Expense")}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tx.category?.name ?? tx.wallet.name} · {formatDate(tx.date)}
                        {tx.tags.length > 0 && ` · ${tx.tags.map((t) => t.tag.name).join(", ")}`}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        isIncome ? "text-success" : "text-foreground"
                      )}
                    >
                      {isIncome ? "+" : tx.type === "expense" ? "-" : ""}
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(tx)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(tx)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        wallets={wallets}
        defaultCurrency={defaultCurrency}
        transaction={editingTransaction}
        onSaved={fetchTransactions}
      />
    </div>
  );
}
