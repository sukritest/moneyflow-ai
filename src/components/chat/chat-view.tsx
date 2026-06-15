"use client";

import * as React from "react";
import { Send, Sparkles, Bot, User as UserIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { ChatMessage } from "@prisma/client";

type ChatViewProps = {
  initialMessages: ChatMessage[];
  initialAiEnabled: boolean;
};

const SUGGESTIONS = ["chat.suggestion1", "chat.suggestion2", "chat.suggestion3"] as const;

export function ChatView({ initialMessages, initialAiEnabled }: ChatViewProps) {
  const { t } = useLocale();
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [aiEnabled] = React.useState(initialAiEnabled);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      userId: "",
      role: "user",
      content: trimmed,
      metadata: null,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimistic.id),
          data.userMessage,
          data.assistantMessage,
        ]);
      }
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3 sm:h-[calc(100vh-6rem)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("chat.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("chat.subtitle")}</p>
        </div>
        {!aiEnabled && (
          <Badge variant="secondary" className="w-fit gap-1">
            <Sparkles className="h-3 w-3" />
            {t("chat.mockMode")}
          </Badge>
        )}
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-6 w-6" />
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">{t("chat.emptyState")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((key) => (
                  <Button key={key} variant="outline" size="sm" onClick={() => sendMessage(t(key))}>
                    {t(key)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex items-start gap-2", message.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {message.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed sm:max-w-[70%]",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-muted px-3.5 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("chat.thinking")}
              </div>
            </div>
          )}
        </CardContent>

        <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={t("chat.placeholder")}
            rows={1}
            className="min-h-[40px] flex-1 resize-none"
          />
          <Button type="submit" size="icon" disabled={sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
