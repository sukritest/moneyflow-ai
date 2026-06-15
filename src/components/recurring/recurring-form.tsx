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
import { recurringSchema, type RecurringInput } from "@/lib/validations/recurring";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Category, Wallet, RecurringTransaction } from "@prisma/client";

type RecurringFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  wallets: Wallet[];
  recurring?: RecurringTransaction | null;
  onSaved: () => void;
};

const NONE_VALUE = "__none__";

export function RecurringForm({ open, onOpenChange, categories, wallets, recurring, onSaved }: RecurringFormProps) {
  const { t } = useLocale();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const isEdit = Boolean(recurring);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecurringInput>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      name: "",
      type: "expense",
      amount: undefined,
      frequency: "monthly",
      dayOfMonth: null,
      categoryId: null,
      walletId: wallets[0]?.id ?? "",
      autoCreate: true,
    },
  });

  const type = watch("type");
  const frequency = watch("frequency");
  const filteredCategories = categories.filter((c) => c.type === type);

  React.useEffect(() => {
    if (open) {
      if (recurring) {
        reset({
          name: recurring.name,
          type: recurring.type as "income" | "expense",
          amount: recurring.amount,
          frequency: recurring.frequency as RecurringInput["frequency"],
          dayOfMonth: recurring.dayOfMonth,
          categoryId: recurring.categoryId,
          walletId: recurring.walletId,
          autoCreate: recurring.autoCreate,
        });
      } else {
        reset({
          name: "",
          type: "expense",
          amount: undefined,
          frequency: "monthly",
          dayOfMonth: null,
          categoryId: null,
          walletId: wallets[0]?.id ?? "",
          autoCreate: true,
        });
      }
      setServerError(null);
    }
  }, [open, recurring, reset, wallets]);

  async function onSubmit(values: RecurringInput) {
    setServerError(null);
    const url = isEdit ? `/api/recurring/${recurring!.id}` : "/api/recurring";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
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
          <DialogTitle>{isEdit ? t("common.edit") : t("recurring.addRecurring")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("recurring.name")}</Label>
            <Input id="name" placeholder="e.g. Netflix" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("transactions.type")}</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">{t("transactions.expense")}</SelectItem>
                      <SelectItem value="income">{t("transactions.income")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">{t("transactions.amount")}</Label>
              <Input id="amount" type="number" step="0.01" min="0" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("recurring.frequency")}</Label>
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t("recurring.daily")}</SelectItem>
                      <SelectItem value="weekly">{t("recurring.weekly")}</SelectItem>
                      <SelectItem value="biweekly">{t("recurring.biweekly")}</SelectItem>
                      <SelectItem value="monthly">{t("recurring.monthly")}</SelectItem>
                      <SelectItem value="yearly">{t("recurring.yearly")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {frequency === "monthly" && (
              <div className="space-y-1.5">
                <Label htmlFor="dayOfMonth">{t("recurring.dayOfMonth")}</Label>
                <Input
                  id="dayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1-31"
                  {...register("dayOfMonth")}
                />
              </div>
            )}
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
                      {filteredCategories.map((c) => (
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.walletId && <p className="text-xs text-destructive">{errors.walletId.message}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{t("recurring.autoCreate")}</p>
              <p className="text-xs text-muted-foreground">{t("recurring.autoCreateHint")}</p>
            </div>
            <Controller
              control={control}
              name="autoCreate"
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
