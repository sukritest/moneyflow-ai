import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calendarEventSchema } from "@/lib/validations/calendar";

export async function GET() {
  const user = await getActiveUser();
  const events = await prisma.calendarEvent.findMany({
    where: { userId: user.id },
    include: { wallet: true },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json({ events });
}

export async function POST(request: NextRequest) {
  const user = await getActiveUser();
  const body = await request.json();
  const parsed = calendarEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await prisma.calendarEvent.create({
    data: {
      userId: user.id,
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

  return NextResponse.json({ event }, { status: 201 });
}
