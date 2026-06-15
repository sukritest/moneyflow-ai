import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { budgetSchema } from "@/lib/validations/budget";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;
  const body = await request.json();
  const parsed = budgetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.budget.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const budget = await prisma.budget.update({
    where: { id },
    data: {
      name: parsed.data.name,
      amount: parsed.data.amount,
      period: parsed.data.period,
      categoryId: parsed.data.categoryId || null,
      walletId: parsed.data.walletId || null,
      alertThreshold: parsed.data.alertThreshold,
      rollover: parsed.data.rollover,
    },
  });

  return NextResponse.json({ budget });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;

  const existing = await prisma.budget.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.budget.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
