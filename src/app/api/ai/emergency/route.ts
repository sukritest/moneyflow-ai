import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateEmergencyPlan } from "@/lib/ai/emergency";

export async function GET() {
  const user = await getActiveUser();
  const plan = await prisma.emergencyPlan.findFirst({
    where: { userId: user.id, resolvedAt: null },
    orderBy: { triggeredAt: "desc" },
  });
  return NextResponse.json({ plan });
}

export async function POST() {
  const user = await getActiveUser();

  const existing = await prisma.emergencyPlan.findFirst({
    where: { userId: user.id, resolvedAt: null },
  });
  if (existing) {
    return NextResponse.json({ plan: existing });
  }

  const plan = await generateEmergencyPlan(user.id, user.currency);
  return NextResponse.json({ plan }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await getActiveUser();
  const body = await request.json();

  const existing = await prisma.emergencyPlan.findFirst({ where: { id: body.id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const plan = await prisma.emergencyPlan.update({
    where: { id: body.id },
    data: { resolvedAt: new Date() },
  });

  return NextResponse.json({ plan });
}
