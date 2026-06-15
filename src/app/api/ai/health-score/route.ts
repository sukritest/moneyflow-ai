import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeHealthScore } from "@/lib/ai/health-score";

export async function GET() {
  const user = await getActiveUser();
  let score = await prisma.financialHealthScore.findFirst({
    where: { userId: user.id },
    orderBy: { computedAt: "desc" },
  });

  if (!score) {
    score = await computeHealthScore(user.id);
  }

  return NextResponse.json({ score });
}

export async function POST() {
  const user = await getActiveUser();
  const score = await computeHealthScore(user.id);
  return NextResponse.json({ score }, { status: 201 });
}
