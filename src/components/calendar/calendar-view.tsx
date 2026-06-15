"use client";

import * as React from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  addMonths,
  subMonths,
  startOfDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Receipt,
  Landmark,
  RefreshCw,
  Wallet as WalletIcon,
  Bell,
  Trash2,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CalendarForm } from "@/components/calendar/calendar-form";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Wallet, CalendarEvent } from "@prisma/client";

type CalendarEventWithRelations = CalendarEvent & { wallet: Wallet | null };

type CalendarViewProps = {
  initialEvents: CalendarEventWithRelations[];
  wallets: Wallet[];
  currency: string;
};

const TYPE_ICON: Record<string, typeof Receipt> = {
  bill: Receipt,
  loan: Landmark,
  subscription: RefreshCw,
  salary: WalletIcon,
  reminder: Bell,
};

export function CalendarView({ initialEvents, wallets, currency }: CalendarViewProps) {
  const { locale, t } = useLocale();
  const [events, setEvents] = React.useState(initialEvents);
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()));
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarEventWithRelations | null>(null);
  const [defaultDate, setDefaultDate] = React.useState<Date | null>(null);

  async function refresh() {
    const res = await fetch("/api/calendar");
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events);
    }
  }

  function openCreate(date?: Date) {
    setEditing(null);
    setDefaultDate(date ?? null);
    setFormOpen(true);
  }

  function openEdit(event: CalendarEventWithRelations) {
    setEditing(event);
    setDefaultDate(null);
    setFormOpen(true);
  }

  async function togglePaid(event: CalendarEventWithRelations, isPaid: boolean) {
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, isPaid } : e)));
    await fetch(`/api/calendar/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid }),
    });
  }

  async function handleDelete(event: CalendarEventWithRelations) {
    if (!confirm(`Delete "${event.title}"?`)) return;
    await fetch(`/api/calendar/${event.id}`, { method: "DELETE" });
    refresh();
  }

  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEventWithRelations[]>();
    for (const e of events) {
      const key = startOfDay(new Date(e.dueDate)).toISOString();
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events]);

  const upcoming = events
    .filter((e) => !e.isPaid)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const weekdayLabels = [t("calendar.sun"), t("calendar.mon"), t("calendar.tue"), t("calendar.wed"), t("calendar.thu"), t("calendar.fri"), t("calendar.sat")];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("calendar.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("calendar.subtitle")}</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="mr-2 h-4 w-4" />
          {t("calendar.addEvent")}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {month.toLocaleDateString(locale === "th" ? "th-TH" : "en-US", { month: "long", year: "numeric" })}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth((m) => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {weekdayLabels.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = startOfDay(day).toISOString();
              const dayEvents = eventsByDay.get(key) ?? [];
              const inMonth = isSameMonth(day, month);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => openCreate(day)}
                  className={cn(
                    "flex min-h-[64px] flex-col items-start gap-1 rounded-md border p-1.5 text-left text-xs transition-colors hover:bg-muted/50",
                    !inMonth && "text-muted-foreground/40",
                    isToday && "border-primary"
                  )}
                >
                  <span className={cn("font-medium", isToday && "text-primary")}>{day.getDate()}</span>
                  {dayEvents.slice(0, 2).map((e) => (
                    <span
                      key={e.id}
                      className={cn(
                        "w-full truncate rounded px-1 text-[10px]",
                        e.isPaid ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
                      )}
                    >
                      {e.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("calendar.upcoming")}</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <CalendarClock className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("calendar.empty")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((event) => {
                const Icon = TYPE_ICON[event.type] ?? Receipt;
                const overdue = isBefore(new Date(event.dueDate), startOfDay(new Date()));
                return (
                  <div key={event.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <Checkbox checked={event.isPaid} onCheckedChange={(checked) => togglePaid(event, Boolean(checked))} />
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <button type="button" className="flex-1 text-left" onClick={() => openEdit(event)}>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className={cn("text-xs text-muted-foreground", overdue && "text-destructive")}>
                        {formatDate(event.dueDate, locale)}
                        {event.wallet ? ` · ${event.wallet.name}` : ""}
                      </p>
                    </button>
                    {event.amount != null && (
                      <Badge variant="outline">{formatCurrency(event.amount, currency, locale)}</Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(event)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CalendarForm
        open={formOpen}
        onOpenChange={setFormOpen}
        wallets={wallets}
        event={editing}
        defaultDate={defaultDate}
        onSaved={refresh}
      />
    </div>
  );
}
