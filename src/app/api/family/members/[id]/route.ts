import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { familyMemberRoleSchema } from "@/lib/validations/family";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getActiveUser();
  const json = await req.json();

  const group = await prisma.familyGroup.findFirst({ where: { ownerId: user.id } });
  if (!group) {
    return NextResponse.json({ error: "Only the group owner can change roles" }, { status: 403 });
  }

  const member = await prisma.familyMember.findFirst({ where: { id, familyGroupId: group.id } });
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (member.userId === group.ownerId) {
    return NextResponse.json({ error: "The owner's role can't be changed" }, { status: 400 });
  }

  const parsed = familyMemberRoleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.familyMember.update({
    where: { id },
    data: { role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  return NextResponse.json({ member: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getActiveUser();

  const member = await prisma.familyMember.findUnique({ where: { id }, include: { familyGroup: true } });
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = member.familyGroup.ownerId === user.id;
  const isSelf = member.userId === user.id;
  if (!isOwner && !isSelf) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (member.userId === member.familyGroup.ownerId) {
    return NextResponse.json({ error: "The owner can't be removed. Delete the group instead." }, { status: 400 });
  }

  await prisma.familyMember.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
