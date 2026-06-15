import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getActiveUser();
  const type = request.nextUrl.searchParams.get("type");

  const categories = await prisma.category.findMany({
    where: {
      OR: [{ userId: user.id }, { userId: null, isSystem: true }],
      ...(type ? { type } : {}),
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ categories });
}

const createCategorySchema = z.object({
  name: z.string().min(1),
  nameTh: z.string().optional().nullable(),
  icon: z.string().default("circle"),
  color: z.string().default("#94a3b8"),
  type: z.enum(["income", "expense"]),
  parentId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const user = await getActiveUser();
  const body = await request.json();
  const parsed = createCategorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: { ...parsed.data, userId: user.id, isSystem: false },
  });

  return NextResponse.json({ category }, { status: 201 });
}
