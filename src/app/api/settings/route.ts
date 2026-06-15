import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validations/settings";

export async function GET() {
  const user = await getActiveUser();

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      currency: user.currency,
      timezone: user.timezone,
      locale: user.locale,
      theme: user.theme,
    },
    subscription,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getActiveUser();
  const body = await req.json();

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
  });

  return NextResponse.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      avatarUrl: updated.avatarUrl,
      currency: updated.currency,
      timezone: updated.timezone,
      locale: updated.locale,
      theme: updated.theme,
    },
  });
}
