import { NextRequest, NextResponse } from "next/server";
import { addMonths } from "date-fns";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subscriptionUpdateSchema } from "@/lib/validations/settings";

export async function GET() {
  const user = await getActiveUser();

  let subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (!subscription) {
    subscription = await prisma.subscription.create({ data: { userId: user.id, plan: "free" } });
  }

  return NextResponse.json({ subscription });
}

/**
 * Mock plan change — no real payment processing. Simulates upgrading,
 * downgrading, or cancelling a subscription for demo purposes.
 */
export async function PATCH(req: NextRequest) {
  const user = await getActiveUser();
  const body = await req.json();

  const parsed = subscriptionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { plan } = parsed.data;
  const now = new Date();

  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      plan,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: plan === "free" ? null : addMonths(now, 1),
      cancelAtPeriodEnd: false,
    },
    update: {
      plan,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: plan === "free" ? null : addMonths(now, 1),
      cancelAtPeriodEnd: false,
    },
  });

  return NextResponse.json({ subscription });
}
