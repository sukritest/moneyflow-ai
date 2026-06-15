"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { budgetSchema, type BudgetInput } from "@/lib/validations/budget";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Category, Wallet, Budget } from "@prisma/client";

type BudgetFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  wallets: Wallet[];
  budget?: Budget | null;
  onSaved: () => void;
};

const NONE_VALUE = "__none__";

export function BudgetForm({ open, onOpenChange, categories, wallets, budget, onSaved }: BudgetFormProps) {
  const { t } = useLocale();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const isEdit = Boolean(budget);

  const expenseCategories = categories.filter((c) => c.type === "expense");

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: "",
      amount: undefined,
      period: "monthly",
      categoryId: null,
      walletId: null,
      alertThreshold: 0.8,
      rollover: false,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (budget) {
        reset({
          name: budget.name,
          amount: budget.amount,
          period: budget.period as "weekly" | "monthly" | "yearly",
          categoryId: budget.categoryId,
          walletId: budget.walletId,
          alertThreshold: budget.alertThreshold,
          rollover: budget.rollover,
        });
      } else {
        reset({
          name: "",
          amount: undefined,
          period: "monthly",
          categoryId: null,
          walletId: null,
          alertThreshold: 0.8,
          rollover: false,
        });
      }
      setServerError(null);
    }
  }, [open, budget, reset]);

  async function onSubmit(values: BudgetInput) {
    setServerError(null);
    const payload = {
      ...values,
      categoryId: values.categoryId || null,
      walletId: values.walletId || null,
    };

    const url = isEdit ? `/api/budgets/${budget!.id}` : "/api/budgets";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setServerError("Something went wrong. Please try again.");
      return;
    }

    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("common.edit") : t("budgets.addBudget")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("budgets.name")}</Label>
            <Input id="name" placeholder="e.g. Groceries" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">{t("transactions.amount")}</Label>
              <Input id="amount" type="number" step="0.01" min="0" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t("budgets.period")}</Label>
              <Controller
                control={control}
                name="period"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">{t("budgets.weekly")}</SelectItem>
                      <SelectItem value="monthly">{t("budgets.monthly")}</SelectItem>
                      <SelectItem value="yearly">{t("budgets.yearly")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("transactions.category")}</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value ?? NONE_VALUE} onValueChange={(v) => field.onChange(v === NONE_VALUE ? null : v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>{t("budgets.allCategories")}</SelectItem>
                      {expenseCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("budgets.wallet")}</Label>
              <Controller
                control={control}
                name="walletId"
                render={({ field }) => (
                  <Select value={field.value ?? NONE_VALUE} onValueChange={(v) => field.onChange(v === NONE_VALUE ? null : v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>{t("budgets.allWallets")}</SelectItem>
                      {wallets.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alertThreshold">{t("budgets.alertThreshold")} (%)</Label>
            <Controller
              control={control}
              name="alertThreshold"
              render={({ field }) => (
                <Input
                  id="alertThreshold"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round((field.value ?? 0.8) * 100)}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    field.onChange(Math.min(1, Math.max(0, (Number.isNaN(pct) ? 0 : pct) / 100)));
                  }}
                />
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Rollover unused budget</p>
              <p className="text-xs text-muted-foreground">Carry leftover amount into next period</p>
            </div>
            <Controller
              control={control}
              name="rollover"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          {serverError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
