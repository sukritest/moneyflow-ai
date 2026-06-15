"use client";

import * as React from "react";
import { Plus, Repeat, MoreVertical, Pencil, Trash2, Wallet as WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecurringForm } from "@/components/recurring/recurring-form";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Category, Wallet, RecurringTransaction } from "@prisma/client";

type RecurringWithRelations = RecurringTransaction & {
  category: Category | null;
  wallet: Wallet;
};

type RecurringViewProps = {
  initialRecurring: RecurringWithRelations[];
  categories: Category[];
  wallets: Wallet[];
  currency: string;
};

const FREQUENCY_KEY: Record<string, string> = {
  daily: "recurring.daily",
  weekly: "recurring.weekly",
  biweekly: "recurring.biweekly",
  monthly: "recurring.monthly",
  yearly: "recurring.yearly",
};

export function RecurringView({ initialRecurring, categories, wallets, currency }: RecurringViewProps) {
  const { locale, t } = useLocale();
  const [recurring, setRecurring] = React.useState(initialRecurring);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RecurringWithRelations | null>(null);

  async function refresh() {
    const res = await fetch("/api/recurring");
    if (res.ok) {
      const data = await res.json();
      setRecurring(data.recurring);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: RecurringWithRelations) {
    setEditing(item);
    setFormOpen(true);
  }

  async function toggleActive(item: RecurringWithRelations, isActive: boolean) {
    setRecurring((prev) => prev.map((r) => (r.id === item.id ? { ...r, isActive } : r)));
    await fetch(`/api/recurring/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
  }

  async function handleDelete(item: RecurringWithRelations) {
    if (!confirm(`Delete the "${item.name}" recurring transaction?`)) return;
    await fetch(`/api/recurring/${item.id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("recurring.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("recurring.subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("recurring.addRecurring")}
        </Button>
      </div>

      {recurring.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Repeat className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">{t("recurring.empty")}</p>
              <p className="text-sm text-muted-foreground">{t("recurring.emptyHint")}</p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t("recurring.addRecurring")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recurring.map((item) => (
            <Card key={item.id} className={cn(!item.isActive && "opacity-60")}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <Badge variant={item.type === "income" ? "secondary" : "outline"}>
                    {item.type === "income" ? t("transactions.income") : t("transactions.expense")}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(item)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("common.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className={cn("text-2xl font-semibold", item.type === "income" ? "text-success" : "text-foreground")}>
                  {formatCurrency(item.amount, currency, locale)}
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>{t("recurring.frequency")}</span>
                    <span className="font-medium text-foreground">{t(FREQUENCY_KEY[item.frequency] ?? item.frequency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t("recurring.nextRun")}</span>
                    <span className="font-medium text-foreground">{formatDate(item.nextRunDate, locale)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <WalletIcon className="h-3.5 w-3.5" />
                      {item.wallet.name}
                    </span>
                    {item.category && <span className="font-medium text-foreground">{item.category.name}</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-medium">{t("recurring.active")}</span>
                  <Switch checked={item.isActive} onCheckedChange={(checked) => toggleActive(item, checked)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RecurringForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        wallets={wallets}
        recurring={editing}
        onSaved={refresh}
      />
    </div>
  );
}
