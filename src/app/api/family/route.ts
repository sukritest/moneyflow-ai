import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { familyGroupSchema } from "@/lib/validations/family";

const groupInclude = {
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { joinedAt: "asc" as const },
  },
  wallets: true,
};

export async function GET() {
  const user = await getActiveUser();

  const membership = await prisma.familyMember.findFirst({
    where: { userId: user.id },
    include: { familyGroup: { include: groupInclude } },
  });

  if (!membership) {
    return NextResponse.json({ group: null });
  }

  return NextResponse.json({
    group: membership.familyGroup,
    currentUserId: user.id,
  });
}

export async function POST(req: NextRequest) {
  const user = await getActiveUser();

  const existing = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (existing) {
    return NextResponse.json({ error: "You already belong to a family group" }, { status: 400 });
  }

  const json = await req.json();
  const parsed = familyGroupSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const group = await prisma.familyGroup.create({
    data: {
      name: parsed.data.name,
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: "owner" },
      },
    },
    include: groupInclude,
  });

  return NextResponse.json({ group, currentUserId: user.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await getActiveUser();
  const json = await req.json();

  const group = await prisma.familyGroup.findFirst({ where: { ownerId: user.id } });
  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = familyGroupSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.familyGroup.update({
    where: { id: group.id },
    data: { name: parsed.data.name },
    include: groupInclude,
  });

  return NextResponse.json({ group: updated, currentUserId: user.id });
}

export async function DELETE() {
  const user = await getActiveUser();

  const group = await prisma.familyGroup.findFirst({ where: { ownerId: user.id } });
  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.wallet.updateMany({
    where: { familyGroupId: group.id },
    data: { familyGroupId: null },
  });
  await prisma.familyGroup.delete({ where: { id: group.id } });

  return NextResponse.json({ success: true });
}
