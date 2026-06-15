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
import { calendarEventSchema, type CalendarEventInput } from "@/lib/validations/calendar";
import { useLocale } from "@/lib/i18n/locale-provider";
import { format } from "date-fns";
import type { Wallet, CalendarEvent } from "@prisma/client";

const NONE_VALUE = "__none__";

type CalendarFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: Wallet[];
  event?: CalendarEvent | null;
  defaultDate?: Date | null;
  onSaved: () => void;
};

export function CalendarForm({ open, onOpenChange, wallets, event, defaultDate, onSaved }: CalendarFormProps) {
  const { t } = useLocale();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const isEdit = Boolean(event);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CalendarEventInput>({
    resolver: zodResolver(calendarEventSchema),
    defaultValues: {
      title: "",
      type: "bill",
      amount: undefined,
      dueDate: defaultDate ?? new Date(),
      notifyDaysBefore: 3,
      notes: "",
      walletId: null,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (event) {
        reset({
          title: event.title,
          type: event.type as CalendarEventInput["type"],
          amount: event.amount,
          dueDate: new Date(event.dueDate),
          notifyDaysBefore: event.notifyDaysBefore,
          notes: event.notes,
          walletId: event.walletId,
        });
      } else {
        reset({
          title: "",
          type: "bill",
          amount: undefined,
          dueDate: defaultDate ?? new Date(),
          notifyDaysBefore: 3,
          notes: "",
          walletId: null,
        });
      }
      setServerError(null);
    }
  }, [open, event, defaultDate, reset]);

  async function onSubmit(values: CalendarEventInput) {
    setServerError(null);
    const url = isEdit ? `/api/calendar/${event!.id}` : "/api/calendar";
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
          <DialogTitle>{isEdit ? t("common.edit") : t("calendar.addEvent")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">{t("calendar.eventTitle")}</Label>
            <Input id="title" placeholder="e.g. Rent payment" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("calendar.eventType")}</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bill">{t("calendar.bill")}</SelectItem>
                      <SelectItem value="loan">{t("calendar.loan")}</SelectItem>
                      <SelectItem value="subscription">{t("calendar.subscription")}</SelectItem>
                      <SelectItem value="salary">{t("calendar.salary")}</SelectItem>
                      <SelectItem value="reminder">{t("calendar.reminder")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">{t("transactions.amount")}</Label>
              <Input id="amount" type="number" step="0.01" min="0" placeholder="0.00" {...register("amount")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">{t("calendar.dueDate")}</Label>
              <Controller
                control={control}
                name="dueDate"
                render={({ field }) => (
                  <Input
                    id="dueDate"
                    type="date"
                    value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : new Date())}
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notifyDaysBefore">{t("calendar.notifyDaysBefore")}</Label>
              <Input id="notifyDaysBefore" type="number" min="0" max="30" {...register("notifyDaysBefore")} />
            </div>
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
                    <SelectItem value={NONE_VALUE}>{t("calendar.noWallet")}</SelectItem>
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

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("calendar.notes")}</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
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
