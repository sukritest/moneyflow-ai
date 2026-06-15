import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { salaryAllocationSchema } from "@/lib/validations/ai";

export async function GET() {
  const user = await getActiveUser();
  const plan = await prisma.salaryAllocationPlan.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { effectiveDate: "desc" },
  });
  return NextResponse.json({ plan });
}

export async function POST(request: NextRequest) {
  const user = await getActiveUser();
  const body = await request.json();
  const parsed = salaryAllocationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.salaryAllocationPlan.updateMany({
    where: { userId: user.id, isActive: true },
    data: { isActive: false },
  });

  const plan = await prisma.salaryAllocationPlan.create({
    data: {
      userId: user.id,
      salaryAmount: parsed.data.salaryAmount,
      savingsPct: parsed.data.savingsPct,
      investmentPct: parsed.data.investmentPct,
      billsPct: parsed.data.billsPct,
      spendingPct: parsed.data.spendingPct,
      isActive: true,
    },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
