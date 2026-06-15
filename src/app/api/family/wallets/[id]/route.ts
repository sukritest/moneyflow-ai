import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getActiveUser();
  const json = await req.json();

  if (typeof json.shared !== "boolean") {
    return NextResponse.json({ error: "shared must be a boolean" }, { status: 400 });
  }

  const wallet = await prisma.wallet.findFirst({ where: { id, userId: user.id } });
  if (!wallet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (!membership) {
    return NextResponse.json({ error: "You're not part of a family group" }, { status: 400 });
  }

  const updated = await prisma.wallet.update({
    where: { id },
    data: {
      familyGroupId: json.shared ? membership.familyGroupId : null,
      type: json.shared ? "shared" : "personal",
    },
  });

  return NextResponse.json({ wallet: updated });
}
