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
import {
  familyGroupSchema,
  familyMemberInviteSchema,
  type FamilyGroupInput,
  type FamilyMemberInviteInput,
} from "@/lib/validations/family";
import { useLocale } from "@/lib/i18n/locale-provider";

type CreateGroupFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function CreateGroupForm({ open, onOpenChange, onSaved }: CreateGroupFormProps) {
  const { t } = useLocale();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FamilyGroupInput>({
    resolver: zodResolver(familyGroupSchema),
    defaultValues: { name: "" },
  });

  React.useEffect(() => {
    if (open) {
      reset({ name: "" });
      setServerError(null);
    }
  }, [open, reset]);

  async function onSubmit(values: FamilyGroupInput) {
    setServerError(null);
    const res = await fetch("/api/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setServerError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("family.createGroup")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="groupName">{t("family.groupName")}</Label>
            <Input id="groupName" {...register("name")} placeholder={t("family.groupNamePlaceholder")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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

type InviteMemberFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function InviteMemberForm({ open, onOpenChange, onSaved }: InviteMemberFormProps) {
  const { t } = useLocale();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FamilyMemberInviteInput>({
    resolver: zodResolver(familyMemberInviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  React.useEffect(() => {
    if (open) {
      reset({ email: "", role: "member" });
      setServerError(null);
    }
  }, [open, reset]);

  async function onSubmit(values: FamilyMemberInviteInput) {
    setServerError(null);
    const res = await fetch("/api/family/members", {
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
          <DialogTitle>{t("family.inviteMember")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" {...register("email")} placeholder="name@example.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{t("family.role")}</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partner">{t("family.roles.partner")}</SelectItem>
                    <SelectItem value="member">{t("family.roles.member")}</SelectItem>
                    <SelectItem value="child">{t("family.roles.child")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("family.inviteHint")}</p>
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
              {t("family.sendInvite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
