import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recurringSchema } from "@/lib/validations/recurring";
import { computeNextRunDate } from "@/lib/recurring";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Lightweight toggle for isActive without full validation
  if (typeof body.isActive === "boolean" && Object.keys(body).length === 1) {
    const recurring = await prisma.recurringTransaction.update({
      where: { id },
      data: { isActive: body.isActive },
      include: { category: true, wallet: true },
    });
    return NextResponse.json({ recurring });
  }

  const parsed = recurringSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const nextRunDate = computeNextRunDate(
    parsed.data.startDate ?? existing.startDate,
    parsed.data.frequency,
    parsed.data.dayOfMonth
  );

  const recurring = await prisma.recurringTransaction.update({
    where: { id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      amount: parsed.data.amount,
      frequency: parsed.data.frequency,
      dayOfMonth: parsed.data.dayOfMonth || null,
      categoryId: parsed.data.categoryId || null,
      walletId: parsed.data.walletId,
      nextRunDate,
    },
    include: { category: true, wallet: true },
  });

  return NextResponse.json({ recurring });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;

  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.recurringTransaction.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
