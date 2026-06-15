import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.receipt.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (typeof body.transactionId !== "string") {
    return NextResponse.json({ error: "transactionId is required" }, { status: 400 });
  }

  const receipt = await prisma.receipt.update({
    where: { id },
    data: { transactionId: body.transactionId },
    include: { transaction: true },
  });

  return NextResponse.json({ receipt });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;

  const existing = await prisma.receipt.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.receipt.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
