"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { transactionSchema, type TransactionInput } from "@/lib/validations/transaction";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Category, Wallet, Receipt } from "@prisma/client";

const NONE_VALUE = "__none__";

type ReceiptConvertFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  wallets: Wallet[];
  receipt: Receipt | null;
  onSaved: () => void;
};

export function ReceiptConvertForm({ open, onOpenChange, categories, wallets, receipt, onSaved }: ReceiptConvertFormProps) {
  const { t } = useLocale();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.type === "expense");

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      currency: "THB",
      date: new Date().toISOString().slice(0, 10),
      walletId: wallets[0]?.id ?? "",
      categoryId: null,
      merchant: "",
      note: "",
      tags: [],
    },
  });

  React.useEffect(() => {
    if (open && receipt) {
      const matchedCategory = expenseCategories.find(
        (c) => c.name.toLowerCase() === (receipt.ocrCategory ?? "").toLowerCase()
      );
      reset({
        type: "expense",
        amount: receipt.ocrAmount ?? 0,
        currency: "THB",
        date: receipt.ocrDate ? new Date(receipt.ocrDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        walletId: wallets[0]?.id ?? "",
        categoryId: matchedCategory?.id ?? null,
        merchant: receipt.ocrMerchant ?? "",
        note: "",
        tags: [],
      });
      setServerError(null);
    }
  }, [open, receipt, wallets, expenseCategories, reset]);

  async function onSubmit(values: TransactionInput) {
    if (!receipt) return;
    setServerError(null);

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setServerError("Something went wrong. Please try again.");
      return;
    }

    const data = await res.json();
    await fetch(`/api/receipts/${receipt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: data.transaction.id }),
    });

    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("receipts.convertToTransaction")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="merchant">{t("transactions.merchant")}</Label>
              <Input id="merchant" {...register("merchant")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">{t("transactions.amount")}</Label>
              <Input id="amount" type="number" step="0.01" min="0" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date">{t("transactions.date")}</Label>
              <Input id="date" type="date" {...register("date")} />
            </div>
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
