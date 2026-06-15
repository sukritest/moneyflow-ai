"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/locale-provider";

const flagFormSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only"),
  label: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean(),
  rolloutPct: z.coerce.number().min(0).max(100),
});
type FlagFormInput = z.infer<typeof flagFormSchema>;

type AdminFlagFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function AdminFlagForm({ open, onOpenChange, onSaved }: AdminFlagFormProps) {
  const { t } = useLocale();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FlagFormInput>({
    resolver: zodResolver(flagFormSchema),
    defaultValues: { key: "", label: "", description: "", enabled: false, rolloutPct: 100 },
  });

  React.useEffect(() => {
    if (open) {
      reset({ key: "", label: "", description: "", enabled: false, rolloutPct: 100 });
      setServerError(null);
    }
  }, [open, reset]);

  async function onSubmit(values: FlagFormInput) {
    setServerError(null);
    const res = await fetch("/api/admin/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setServerError(typeof data.error === "string" ? data.error : "Something went wrong. Please try again.");
      return;
    }
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.addFlag")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="key">{t("admin.key")}</Label>
            <Input id="key" {...register("key")} placeholder="new_feature" />
            {errors.key && <p className="text-xs text-destructive">{errors.key.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="label">{t("admin.label")}</Label>
            <Input id="label" {...register("label")} />
            {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">{t("admin.description")}</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rolloutPct">{t("admin.rollout")}</Label>
              <Input id="rolloutPct" type="number" min="0" max="100" {...register("rolloutPct")} />
              {errors.rolloutPct && <p className="text-xs text-destructive">{errors.rolloutPct.message}</p>}
            </div>
            <div className="flex items-end justify-between space-y-1.5 pb-2">
              <Label htmlFor="enabled">{t("admin.enabled")}</Label>
              <Controller
                control={control}
                name="enabled"
                render={({ field }) => <Switch id="enabled" checked={field.value} onCheckedChange={field.onChange} />}
              />
            </div>
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
