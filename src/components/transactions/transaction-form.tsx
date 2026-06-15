"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { transactionSchema, type TransactionInput } from "@/lib/validations/transaction";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Category, Wallet, Transaction, TransactionTag, Tag } from "@prisma/client";

type TransactionWithRelations = Transaction & {
  category: Category | null;
  tags: (TransactionTag & { tag: Tag })[];
};

type TransactionFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  wallets: Wallet[];
  defaultCurrency: string;
  transaction?: TransactionWithRelations | null;
  onSaved: () => void;
};

function toDateInputValue(date: Date | string) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

export function TransactionForm({
  open,
  onOpenChange,
  categories,
  wallets,
  defaultCurrency,
  transaction,
  onSaved,
}: TransactionFormProps) {
  const { t } = useLocale();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const isEdit = Boolean(transaction);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      amount: undefined,
      currency: defaultCurrency,
      date: toDateInputValue(new Date()),
      walletId: wallets[0]?.id ?? "",
      categoryId: null,
      merchant: "",
      note: "",
      tags: [],
    },
  });

  const type = watch("type");

  React.useEffect(() => {
    if (open) {
      if (transaction) {
        reset({
          type: transaction.type as "income" | "expense" | "transfer",
          amount: transaction.amount,
          currency: transaction.currency,
          date: toDateInputValue(transaction.date),
          walletId: transaction.walletId,
          categoryId: transaction.categoryId,
          merchant: transaction.merchant ?? "",
          note: transaction.note ?? "",
          tags: transaction.tags.map((t) => t.tag.name),
        });
      } else {
        reset({
          type: "expense",
          amount: undefined,
          currency: defaultCurrency,
          date: toDateInputValue(new Date()),
          walletId: wallets[0]?.id ?? "",
          categoryId: null,
          merchant: "",
          note: "",
          tags: [],
        });
      }
      setServerError(null);
    }
  }, [open, transaction, reset, wallets, defaultCurrency]);

  const filteredCategories = categories.filter((c) => c.type === (type === "transfer" ? "expense" : type));

  async function onSubmit(values: TransactionInput) {
    setServerError(null);
    const tags = values.tags?.length
      ? values.tags
      : (typeof (document.getElementById("tx-tags") as HTMLInputElement | null)?.value === "string"
          ? (document.getElementById("tx-tags") as HTMLInputElement).value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : []);

    const payload = { ...values, tags, categoryId: values.categoryId || null };

    const url = isEdit ? `/api/transactions/${transaction!.id}` : "/api/transactions";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setServerError(data?.error ? "Please check the form for errors." : "Something went wrong. Please try again.");
      return;
    }

    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("common.edit") : t("transactions.addTransaction")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Tabs value={field.value} onValueChange={(v) => {
                field.onChange(v);
                setValue("categoryId", null);
              }}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="expense">{t("transactions.expense")}</TabsTrigger>
                  <TabsTrigger value="income">{t("transactions.income")}</TabsTrigger>
                  <TabsTrigger value="transfer">Transfer</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">{t("transactions.amount")}</Label>
              <Input id="amount" type="number" step="0.01" min="0" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">{t("transactions.date")}</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Wallet</Label>
              <Controller
                control={control}
                name="walletId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.icon} {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.walletId && <p className="text-xs text-destructive">{errors.walletId.message}</p>}
            </div>

            {type !== "transfer" && (
              <div className="space-y-1.5">
                <Label>{t("transactions.category")}</Label>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
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
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="merchant">{t("transactions.merchant")}</Label>
            <Input id="merchant" placeholder="e.g. Starbucks" {...register("merchant")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">{t("transactions.note")}</Label>
            <Textarea id="note" rows={2} placeholder="Optional note" {...register("note")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-tags">{t("transactions.tags")}</Label>
            <Input
              id="tx-tags"
              placeholder="comma, separated, tags"
              defaultValue={transaction?.tags.map((t) => t.tag.name).join(", ") ?? ""}
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
