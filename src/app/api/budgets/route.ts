import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { budgetSchema } from "@/lib/validations/budget";
import { getBudgetsWithSpending } from "@/lib/data/budgets";

export async function GET() {
  const user = await getActiveUser();
  const budgets = await getBudgetsWithSpending(user.id);
  return NextResponse.json({ budgets });
}

export async function POST(request: NextRequest) {
  const user = await getActiveUser();
  const body = await request.json();
  const parsed = budgetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const budget = await prisma.budget.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      amount: parsed.data.amount,
      period: parsed.data.period,
      categoryId: parsed.data.categoryId || null,
      walletId: parsed.data.walletId || null,
      alertThreshold: parsed.data.alertThreshold,
      rollover: parsed.data.rollover,
    },
  });

  return NextResponse.json({ budget }, { status: 201 });
}
