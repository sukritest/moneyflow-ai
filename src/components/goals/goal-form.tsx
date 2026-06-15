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
import { goalSchema, type GoalInput } from "@/lib/validations/goal";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Goal } from "@prisma/client";

type GoalFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  onSaved: () => void;
};

const GOAL_TYPES: GoalInput["type"][] = ["saving", "emergency_fund", "travel", "car", "house", "custom"];
const GOAL_TYPE_ICONS: Record<string, string> = {
  saving: "piggy-bank",
  emergency_fund: "shield",
  travel: "plane",
  car: "car",
  house: "home",
  custom: "target",
};

function toDateInputValue(date: Date | string | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function GoalForm({ open, onOpenChange, goal, onSaved }: GoalFormProps) {
  const { t } = useLocale();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const isEdit = Boolean(goal);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      type: "custom",
      icon: "target",
      targetAmount: undefined,
      currentAmount: 0,
      targetDate: "",
      priority: "medium",
      status: "active",
      monthlyContribution: undefined,
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      if (goal) {
        reset({
          name: goal.name,
          type: goal.type as GoalInput["type"],
          icon: goal.icon,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          targetDate: toDateInputValue(goal.targetDate),
          priority: goal.priority as GoalInput["priority"],
          status: goal.status as GoalInput["status"],
          monthlyContribution: goal.monthlyContribution ?? undefined,
          notes: goal.notes ?? "",
        });
      } else {
        reset({
          name: "",
          type: "custom",
          icon: "target",
          targetAmount: undefined,
          currentAmount: 0,
          targetDate: "",
          priority: "medium",
          status: "active",
          monthlyContribution: undefined,
          notes: "",
        });
      }
      setServerError(null);
    }
  }, [open, goal, reset]);

  async function onSubmit(values: GoalInput) {
    setServerError(null);
    const payload = {
      ...values,
      icon: GOAL_TYPE_ICONS[values.type] ?? "target",
      targetDate: values.targetDate || null,
      notes: values.notes || null,
    };

    const url = isEdit ? `/api/goals/${goal!.id}` : "/api/goals";
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
          <DialogTitle>{isEdit ? t("common.edit") : t("goals.addGoal")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("goals.name")}</Label>
            <Input id="name" placeholder="e.g. Emergency Fund" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`goals.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("goals.priority")}</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("goals.low")}</SelectItem>
                      <SelectItem value="medium">{t("goals.medium")}</SelectItem>
                      <SelectItem value="high">{t("goals.high")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="targetAmount">{t("goals.targetAmount")}</Label>
              <Input id="targetAmount" type="number" step="0.01" min="0" placeholder="0.00" {...register("targetAmount")} />
              {errors.targetAmount && <p className="text-xs text-destructive">{errors.targetAmount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentAmount">{t("goals.currentAmount")}</Label>
              <Input id="currentAmount" type="number" step="0.01" min="0" placeholder="0.00" {...register("currentAmount")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="targetDate">{t("goals.targetDate")}</Label>
              <Input id="targetDate" type="date" {...register("targetDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monthlyContribution">{t("goals.monthlyAmount")}</Label>
              <Input id="monthlyContribution" type="number" step="0.01" min="0" placeholder="0.00" {...register("monthlyContribution")} />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <Label>{t("goals.status")}</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("goals.active")}</SelectItem>
                      <SelectItem value="completed">{t("goals.completed")}</SelectItem>
                      <SelectItem value="paused">{t("goals.paused")}</SelectItem>
                      <SelectItem value="cancelled">{t("goals.cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("transactions.note")}</Label>
            <Textarea id="notes" rows={2} placeholder="Optional note" {...register("notes")} />
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
