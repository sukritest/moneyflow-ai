import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recurringSchema } from "@/lib/validations/recurring";
import { computeNextRunDate } from "@/lib/recurring";

export async function GET() {
  const user = await getActiveUser();
  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId: user.id },
    include: { category: true, wallet: true },
    orderBy: { nextRunDate: "asc" },
  });
  return NextResponse.json({ recurring });
}

export async function POST(request: NextRequest) {
  const user = await getActiveUser();
  const body = await request.json();
  const parsed = recurringSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const startDate = parsed.data.startDate ?? new Date();
  const nextRunDate = computeNextRunDate(startDate, parsed.data.frequency, parsed.data.dayOfMonth);

  const recurring = await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      amount: parsed.data.amount,
      frequency: parsed.data.frequency,
      dayOfMonth: parsed.data.dayOfMonth || null,
      categoryId: parsed.data.categoryId || null,
      walletId: parsed.data.walletId,
      startDate,
      nextRunDate,
      autoCreate: parsed.data.autoCreate,
    },
    include: { category: true, wallet: true },
  });

  return NextResponse.json({ recurring }, { status: 201 });
}
