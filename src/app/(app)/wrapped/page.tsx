import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMonthlyWrapped } from "@/lib/wrapped";
import { WrappedView } from "@/components/wrapped/wrapped-view";
import { startOfMonth, subMonths } from "date-fns";

export const metadata: Metadata = {
  title: "Wrapped | MoneyFlow AI",
};

export default async function WrappedPage() {
  const user = await getActiveUser();
  const month = startOfMonth(subMonths(new Date(), 1));

  let wrapped = await prisma.monthlyWrapped.findUnique({
    where: { userId_month: { userId: user.id, month } },
  });

  if (!wrapped) {
    wrapped = await generateMonthlyWrapped(user.id, month);
  }

  const history = await prisma.monthlyWrapped.findMany({
    where: { userId: user.id },
    orderBy: { month: "desc" },
    select: { month: true },
  });

  return (
    <WrappedView
      initialWrapped={wrapped}
      initialHistory={history.map((h) => h.month)}
      currency={user.currency}
    />
  );
}
