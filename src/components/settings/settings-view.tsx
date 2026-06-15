"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { Loader2, User, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  profileSchema,
  CURRENCIES,
  TIMEZONES,
  type ProfileInput,
} from "@/lib/validations/settings";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatDate, getInitials } from "@/lib/utils";
import type { Subscription } from "@prisma/client";

type SettingsUser = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  currency: string;
  timezone: string;
  locale: "en" | "th";
  theme: "light" | "dark" | "system";
};

type SettingsViewProps = {
  initialUser: SettingsUser;
  initialSubscription: Subscription | null;
};

const PLAN_ORDER = ["free", "pro", "family"] as const;

export function SettingsView({ initialUser, initialSubscription }: SettingsViewProps) {
  const { locale, t, setLocale } = useLocale();
  const { setTheme } = useTheme();
  const [subscription, setSubscription] = React.useState(initialSubscription);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [planLoading, setPlanLoading] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialUser.name ?? "",
      currency: initialUser.currency as ProfileInput["currency"],
      timezone: initialUser.timezone,
      locale: initialUser.locale,
      theme: initialUser.theme,
    },
  });

  async function onSubmit(values: ProfileInput) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) return;

    setLocale(values.locale);
    setTheme(values.theme);
    setSavedAt(Date.now());
  }

  async function changePlan(plan: (typeof PLAN_ORDER)[number]) {
    setPlanLoading(plan);
    const res = await fetch("/api/settings/subscription", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      const data = await res.json();
      setSubscription(data.subscription);
    }
    setPlanLoading(null);
  }

  const currentPlan = subscription?.plan ?? "free";

  const plans = [
    {
      key: "free" as const,
      name: "Free",
      price: t("settings.allFeaturesFree"),
      features: ["transactions.title", "budgets.title", "goals.title"],
    },
    {
      key: "pro" as const,
      name: "Pro",
      price: t("settings.allFeaturesFree"),
      features: ["chat.title", "forecast.title", "insights.title", "wrapped.title"],
    },
    {
      key: "family" as const,
      name: "Family",
      price: t("settings.allFeaturesFree"),
      features: ["family.title", "chat.title", "forecast.title", "insights.title"],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={initialUser.avatarUrl ?? undefined} />
              <AvatarFallback>{getInitials(initialUser.name ?? initialUser.email)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{t("settings.profile")}</CardTitle>
              <CardDescription>{initialUser.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("auth.name")}</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t("settings.currency")}</Label>
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("settings.language")}</Label>
                <Controller
                  control={control}
                  name="locale"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="th">ไทย</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("settings.theme")}</Label>
                <Controller
                  control={control}
                  name="theme"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">{t("common.light")}</SelectItem>
                        <SelectItem value="dark">{t("common.dark")}</SelectItem>
                        <SelectItem value="system">{t("common.system")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("settings.timezone")}</Label>
                <Controller
                  control={control}
                  name="timezone"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("common.save")}
              </Button>
              {savedAt && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5" /> {formatDate(new Date(savedAt), locale, { hour: "numeric", minute: "numeric" })}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-primary" />
            {t("settings.billing")}
          </CardTitle>
          <CardDescription>
            {t("settings.currentPlan")}:{" "}
            <Badge variant="secondary" className="ml-1 capitalize">
              {currentPlan}
            </Badge>
            {subscription?.currentPeriodEnd && (
              <span className="ml-2">
                · {formatDate(new Date(subscription.currentPeriodEnd), locale)}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = currentPlan === plan.key;
              return (
                <div
                  key={plan.key}
                  className={`flex flex-col gap-3 rounded-lg border p-4 ${isCurrent ? "border-primary bg-primary/5" : ""}`}
                >
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">{plan.price}</p>
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-primary" />
                        {t(f)}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? "outline" : "default"}
                    size="sm"
                    disabled={isCurrent || planLoading === plan.key}
                    onClick={() => changePlan(plan.key)}
                  >
                    {planLoading === plan.key && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    {isCurrent ? t("settings.currentPlanBadge") : `${t("settings.choosePlan")} ${plan.name}`}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("settings.allFeaturesFree")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            {t("settings.account")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{initialUser.email}</p>
        </CardContent>
      </Card>
    </div>
  );
}
