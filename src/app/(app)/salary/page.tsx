import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SalaryPlannerView } from "@/components/salary/salary-planner-view";

export const metadata: Metadata = {
  title: "Salary Planner | MoneyFlow AI",
};

export default async function SalaryPage() {
  const user = await getActiveUser();

  const plan = await prisma.salaryAllocationPlan.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { effectiveDate: "desc" },
  });

  return <SalaryPlannerView initialPlan={plan} currency={user.currency} />;
}
