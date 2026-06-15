import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema, transactionFiltersSchema } from "@/lib/validations/transaction";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getActiveUser();
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = transactionFiltersSchema.parse(searchParams);

  const where: Prisma.TransactionWhereInput = { userId: user.id };

  if (filters.type && filters.type !== "all") {
    where.type = filters.type;
  }
  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }
  if (filters.walletId) {
    where.walletId = filters.walletId;
  }
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = new Date(filters.from);
    if (filters.to) where.date.lte = new Date(filters.to);
  }
  if (filters.search) {
    where.OR = [
      { merchant: { contains: filters.search } },
      { note: { contains: filters.search } },
    ];
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, wallet: true, tags: { include: { tag: true } } },
      orderBy: { date: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({
    transactions,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  });
}

export async function POST(request: NextRequest) {
  const user = await getActiveUser();
  const body = await request.json();
  const parsed = transactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tags, ...data } = parsed.data;

  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      walletId: data.walletId,
      categoryId: data.categoryId || null,
      type: data.type,
      amount: data.amount,
      currency: data.currency || user.currency,
      date: new Date(data.date),
      merchant: data.merchant || null,
      note: data.note || null,
      source: "manual",
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

  // Keep wallet balance in sync with manual transactions.
  const balanceDelta = data.type === "income" ? data.amount : data.type === "expense" ? -data.amount : 0;
  if (balanceDelta !== 0) {
    await prisma.wallet.update({
      where: { id: data.walletId },
      data: { balance: { increment: balanceDelta } },
    });
  }

  return NextResponse.json({ transaction }, { status: 201 });
}
