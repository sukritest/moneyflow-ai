import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calendarEventSchema } from "@/lib/validations/calendar";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.calendarEvent.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Lightweight toggle for isPaid without full validation
  if (typeof body.isPaid === "boolean" && Object.keys(body).length === 1) {
    const event = await prisma.calendarEvent.update({
      where: { id },
      data: { isPaid: body.isPaid },
      include: { wallet: true },
    });
    return NextResponse.json({ event });
  }

  const parsed = calendarEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      amount: parsed.data.amount ?? null,
      dueDate: parsed.data.dueDate,
      notifyDaysBefore: parsed.data.notifyDaysBefore,
      notes: parsed.data.notes || null,
      walletId: parsed.data.walletId || null,
    },
    include: { wallet: true },
  });

  return NextResponse.json({ event });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;

  const existing = await prisma.calendarEvent.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.calendarEvent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
