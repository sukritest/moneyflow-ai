import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { familyMemberInviteSchema } from "@/lib/validations/family";

export async function POST(req: NextRequest) {
  const user = await getActiveUser();
  const json = await req.json();

  const parsed = familyMemberInviteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const group = await prisma.familyGroup.findFirst({ where: { ownerId: user.id } });
  if (!group) {
    return NextResponse.json({ error: "Only the group owner can invite members" }, { status: 403 });
  }

  const targetUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!targetUser) {
    return NextResponse.json(
      { error: "No MoneyFlow account found for this email yet" },
      { status: 404 }
    );
  }

  const alreadyMember = await prisma.familyMember.findFirst({
    where: { familyGroupId: group.id, userId: targetUser.id },
  });
  if (alreadyMember) {
    return NextResponse.json({ error: "This person is already in your family group" }, { status: 400 });
  }

  const member = await prisma.familyMember.create({
    data: {
      familyGroupId: group.id,
      userId: targetUser.id,
      role: parsed.data.role,
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ member }, { status: 201 });
}
