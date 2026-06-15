import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateFlagSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
  rolloutPct: z.coerce.number().min(0).max(100).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getActiveUser();
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const flag = await prisma.featureFlag.findUnique({ where: { id } });
  if (!flag) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const json = await req.json();
  const keys = Object.keys(json);

  // Lightweight single-field toggle (enabled or rolloutPct) skips full validation.
  if (keys.length === 1 && (keys[0] === "enabled" || keys[0] === "rolloutPct")) {
    const updated = await prisma.featureFlag.update({
      where: { id },
      data: { [keys[0]]: json[keys[0]] },
    });
    return NextResponse.json({ flag: updated });
  }

  const parsed = updateFlagSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.featureFlag.update({
    where: { id },
    data: {
      ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
      ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
      ...(parsed.data.rolloutPct !== undefined ? { rolloutPct: parsed.data.rolloutPct } : {}),
    },
  });

  return NextResponse.json({ flag: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getActiveUser();
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const flag = await prisma.featureFlag.findUnique({ where: { id } });
  if (!flag) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.featureFlag.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
