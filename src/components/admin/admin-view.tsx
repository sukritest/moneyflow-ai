"use client";

import * as React from "react";
import { Users, Receipt, Wallet as WalletIcon, Crown, Plus, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminFlagForm } from "@/components/admin/admin-flag-form";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatNumber } from "@/lib/utils";
import type { FeatureFlag } from "@prisma/client";

type AdminStats = {
  totalUsers: number;
  totalTransactions: number;
  totalWallets: number;
  proUsers: number;
};

type AdminViewProps = {
  initialFlags: FeatureFlag[];
  stats: AdminStats;
};

export function AdminView({ initialFlags, stats }: AdminViewProps) {
  const { locale, t } = useLocale();
  const [flags, setFlags] = React.useState(initialFlags);
  const [formOpen, setFormOpen] = React.useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/flags");
    if (res.ok) {
      const data = await res.json();
      setFlags(data.flags);
    }
  }

  async function toggleEnabled(flag: FeatureFlag, enabled: boolean) {
    setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, enabled } : f)));
    await fetch(`/api/admin/flags/${flag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
  }

  async function updateRollout(flag: FeatureFlag, rolloutPct: number) {
    setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, rolloutPct } : f)));
    await fetch(`/api/admin/flags/${flag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rolloutPct }),
    });
  }

  async function handleDelete(flag: FeatureFlag) {
    if (!confirm(t("admin.deleteConfirm"))) return;
    await fetch(`/api/admin/flags/${flag.id}`, { method: "DELETE" });
    refresh();
  }

  const statCards = [
    { label: t("admin.totalUsers"), value: stats.totalUsers, icon: Users },
    { label: t("admin.totalTransactions"), value: stats.totalTransactions, icon: Receipt },
    { label: t("admin.totalWallets"), value: stats.totalWallets, icon: WalletIcon },
    { label: t("admin.proUsers"), value: stats.proUsers, icon: Crown },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {t("admin.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("admin.subtitle")}</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.addFlag")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-semibold">{formatNumber(stat.value, locale)}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.featureFlags")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.noFlags")}</p>
          ) : (
            flags.map((flag) => (
              <div key={flag.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{flag.label}</p>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {flag.key}
                    </Badge>
                  </div>
                  {flag.description && <p className="text-xs text-muted-foreground">{flag.description}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t("admin.rollout")}</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      className="h-8 w-20"
                      defaultValue={flag.rolloutPct}
                      onBlur={(e) => {
                        const value = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                        if (value !== flag.rolloutPct) updateRollout(flag, value);
                      }}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <Switch checked={flag.enabled} onCheckedChange={(checked) => toggleEnabled(flag, checked)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(flag)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AdminFlagForm open={formOpen} onOpenChange={setFormOpen} onSaved={refresh} />
    </div>
  );
}
