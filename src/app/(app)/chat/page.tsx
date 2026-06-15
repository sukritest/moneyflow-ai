import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/openai";
import { ChatView } from "@/components/chat/chat-view";

export const metadata: Metadata = {
  title: "AI Assistant | MoneyFlow AI",
};

export default async function ChatPage() {
  const user = await getActiveUser();

  const messages = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return <ChatView initialMessages={messages} initialAiEnabled={isAIEnabled} />;
}
