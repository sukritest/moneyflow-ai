import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalSchema } from "@/lib/validations/goal";

export async function GET() {
  const user = await getActiveUser();
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  const user = await getActiveUser();
  const body = await request.json();
  const parsed = goalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
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

  return NextResponse.json({ goal }, { status: 201 });
}
