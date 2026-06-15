import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = {
  title: "Settings | MoneyFlow AI",
};

export default async function SettingsPage() {
  const user = await getActiveUser();

  const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });

  return (
    <SettingsView
      initialUser={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        currency: user.currency,
        timezone: user.timezone,
        locale: user.locale as "en" | "th",
        theme: user.theme as "light" | "dark" | "system",
      }}
      initialSubscription={subscription}
    />
  );
}
