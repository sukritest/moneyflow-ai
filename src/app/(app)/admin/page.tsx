import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSeedFeatureFlags } from "@/lib/feature-flags";
import { AdminView } from "@/components/admin/admin-view";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Admin | MoneyFlow AI",
};

export default async function AdminPage() {
  const user = await getActiveUser();

  if (user.role !== "admin") {
    const dict = await getDictionary(user.locale as "en" | "th");
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">{dict.admin.accessDenied}</p>
          <p className="text-sm text-muted-foreground">{dict.admin.accessDeniedHint}</p>
        </div>
      </div>
    );
  }

  const [flags, totalUsers, totalTransactions, totalWallets, proUsers] = await Promise.all([
    getOrSeedFeatureFlags(),
    prisma.user.count(),
    prisma.transaction.count(),
    prisma.wallet.count(),
    prisma.subscription.count({ where: { plan: { in: ["pro", "family"] } } }),
  ]);

  return (
    <AdminView
      initialFlags={flags}
      stats={{ totalUsers, totalTransactions, totalWallets, proUsers }}
    />
  );
}
