import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatMessageSchema } from "@/lib/validations/ai";
import { getChatReply } from "@/lib/ai/chat";
import { isAIEnabled } from "@/lib/openai";

export async function GET() {
  const user = await getActiveUser();
  const messages = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return NextResponse.json({ messages, aiEnabled: isAIEnabled });
}

export async function POST(request: NextRequest) {
  const user = await getActiveUser();
  const body = await request.json();
  const parsed = chatMessageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userMessage = await prisma.chatMessage.create({
    data: { userId: user.id, role: "user", content: parsed.data.message },
  });

  const replyText = await getChatReply(user.id, parsed.data.message, user.currency);

  const assistantMessage = await prisma.chatMessage.create({
    data: { userId: user.id, role: "assistant", content: replyText },
  });

  return NextResponse.json({ userMessage, assistantMessage });
}
