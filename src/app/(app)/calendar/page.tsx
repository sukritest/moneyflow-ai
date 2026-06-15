import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata: Metadata = {
  title: "Calendar | MoneyFlow AI",
};

export default async function CalendarPage() {
  const user = await getActiveUser();

  const [events, wallets] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId: user.id },
      include: { wallet: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.wallet.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  return <CalendarView initialEvents={events} wallets={wallets} currency={user.currency} />;
}
