import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmergencyView } from "@/components/emergency/emergency-view";

export const metadata: Metadata = {
  title: "Emergency Mode | MoneyFlow AI",
};

export default async function EmergencyPage() {
  const user = await getActiveUser();

  const plan = await prisma.emergencyPlan.findFirst({
    where: { userId: user.id, resolvedAt: null },
    orderBy: { triggeredAt: "desc" },
  });

  return <EmergencyView initialPlan={plan} currency={user.currency} />;
}
