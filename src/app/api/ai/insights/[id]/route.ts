import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const existing = await prisma.insight.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const insight = await prisma.insight.update({
    where: { id },
    data: { isRead: body.isRead ?? true },
  });

  return NextResponse.json({ insight });
}
