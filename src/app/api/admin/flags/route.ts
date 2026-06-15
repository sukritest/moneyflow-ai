import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSeedFeatureFlags } from "@/lib/feature-flags";
import { z } from "zod";

const createFlagSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only"),
  label: z.string().min(1),
  description: z.string().optional().nullable(),
  enabled: z.boolean().default(false),
  rolloutPct: z.coerce.number().min(0).max(100).default(100),
});

export async function GET() {
  const user = await getActiveUser();
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const flags = await getOrSeedFeatureFlags();
  return NextResponse.json({ flags });
}

export async function POST(req: NextRequest) {
  const user = await getActiveUser();
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = createFlagSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.featureFlag.findUnique({ where: { key: parsed.data.key } });
  if (existing) {
    return NextResponse.json({ error: "A flag with this key already exists" }, { status: 400 });
  }

  const flag = await prisma.featureFlag.create({
    data: {
      key: parsed.data.key,
      label: parsed.data.label,
      description: parsed.data.description || null,
      enabled: parsed.data.enabled,
      rolloutPct: parsed.data.rolloutPct,
    },
  });

  return NextResponse.json({ flag }, { status: 201 });
}
