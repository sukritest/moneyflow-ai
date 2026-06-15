import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMonthlyWrapped } from "@/lib/wrapped";
import { startOfMonth, subMonths } from "date-fns";

function resolveMonth(monthParam: string | null): Date {
  if (monthParam) {
    const parsed = new Date(monthParam);
    if (!Number.isNaN(parsed.getTime())) return startOfMonth(parsed);
  }
  // Default to last month, since the current month is usually incomplete.
  return startOfMonth(subMonths(new Date(), 1));
}

export async function GET(req: NextRequest) {
  const user = await getActiveUser();
  const month = resolveMonth(req.nextUrl.searchParams.get("month"));

  let wrapped = await prisma.monthlyWrapped.findUnique({
    where: { userId_month: { userId: user.id, month } },
  });

  if (!wrapped) {
    wrapped = await generateMonthlyWrapped(user.id, month);
  }

  const history = await prisma.monthlyWrapped.findMany({
    where: { userId: user.id },
    orderBy: { month: "desc" },
    select: { month: true },
  });

  return NextResponse.json({ wrapped, history: history.map((h) => h.month) });
}

export async function POST(req: NextRequest) {
  const user = await getActiveUser();
  const body = await req.json().catch(() => ({}));
  const month = resolveMonth(typeof body.month === "string" ? body.month : null);

  const wrapped = await generateMonthlyWrapped(user.id, month);

  return NextResponse.json({ wrapped }, { status: 201 });
}
