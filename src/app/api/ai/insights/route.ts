import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInsights } from "@/lib/ai/insights";
import { isAIEnabled } from "@/lib/openai";

export async function GET() {
  const user = await getActiveUser();
  let insights = await prisma.insight.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (insights.length === 0) {
    await generateInsights(user.id, user.currency);
    insights = await prisma.insight.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  return NextResponse.json({ insights, aiEnabled: isAIEnabled });
}

export async function POST() {
  const user = await getActiveUser();
  const created = await generateInsights(user.id, user.currency);
  const insights = await prisma.insight.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ insights, created: created.length }, { status: 201 });
}
