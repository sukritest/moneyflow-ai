import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validations/transaction";

function balanceDelta(type: string, amount: number) {
  if (type === "income") return amount;
  if (type === "expense") return -amount;
  return 0;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    include: { category: true, wallet: true, tags: { include: { tag: true } }, receipt: true },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ transaction });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;
  const body = await request.json();
  const parsed = transactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { tags, ...data } = parsed.data;

  // Reverse the old balance impact, then apply the new one.
  const oldDelta = balanceDelta(existing.type, existing.amount);
  const newDelta = balanceDelta(data.type, data.amount);

  if (existing.walletId === data.walletId) {
    const net = newDelta - oldDelta;
    if (net !== 0) {
      await prisma.wallet.update({ where: { id: data.walletId }, data: { balance: { increment: net } } });
    }
  } else {
    if (oldDelta !== 0) {
      await prisma.wallet.update({ where: { id: existing.walletId }, data: { balance: { increment: -oldDelta } } });
    }
    if (newDelta !== 0) {
      await prisma.wallet.update({ where: { id: data.walletId }, data: { balance: { increment: newDelta } } });
    }
  }

  if (tags) {
    await prisma.transactionTag.deleteMany({ where: { transactionId: id } });
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      walletId: data.walletId,
      categoryId: data.categoryId || null,
      type: data.type,
      amount: data.amount,
      currency: data.currency || user.currency,
      date: new Date(data.date),
      merchant: data.merchant || null,
      note: data.note || null,
      ...(tags && tags.length > 0
        ? {
            tags: {
              create: await Promise.all(
                tags.map(async (name) => {
                  const tag = await prisma.tag.upsert({
                    where: { userId_name: { userId: user.id, name } },
                    update: {},
                    create: { userId: user.id, name },
                  });
                  return { tagId: tag.id };
                })
              ),
            },
          }
        : {}),
    },
    include: { category: true, wallet: true, tags: { include: { tag: true } } },
  });

  return NextResponse.json({ transaction });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser();
  const { id } = await params;

  const existing = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const delta = balanceDelta(existing.type, existing.amount);
  if (delta !== 0) {
    await prisma.wallet.update({ where: { id: existing.walletId }, data: { balance: { increment: -delta } } });
  }

  await prisma.transactionTag.deleteMany({ where: { transactionId: id } });
  await prisma.transaction.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
