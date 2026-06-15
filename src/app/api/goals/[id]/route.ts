import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalSchema } from "@/lib/validations/goal";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;
  const body = await request.json();
  const parsed = goalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.goal.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      icon: parsed.data.icon,
      targetAmount: parsed.data.targetAmount,
      currentAmount: parsed.data.currentAmount,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      priority: parsed.data.priority,
      status: parsed.data.status,
      monthlyContribution: parsed.data.monthlyContribution ?? null,
      notes: parsed.data.notes || null,
    },
  });

  return NextResponse.json({ goal });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;

  const existing = await prisma.goal.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.goalContribution.deleteMany({ where: { goalId: id } });
  await prisma.goal.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
