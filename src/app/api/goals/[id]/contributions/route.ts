import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contributionSchema } from "@/lib/validations/goal";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;
  const body = await request.json();
  const parsed = contributionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const goal = await prisma.goal.findFirst({ where: { id, userId: user.id } });
  if (!goal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.goalContribution.create({
    data: {
      goalId: id,
      userId: user.id,
      amount: parsed.data.amount,
      note: parsed.data.note || null,
    },
  });

  const newAmount = goal.currentAmount + parsed.data.amount;
  const updated = await prisma.goal.update({
    where: { id },
    data: {
      currentAmount: newAmount,
      status: newAmount >= goal.targetAmount && goal.status === "active" ? "completed" : goal.status,
    },
  });

  return NextResponse.json({ goal: updated }, { status: 201 });
}
