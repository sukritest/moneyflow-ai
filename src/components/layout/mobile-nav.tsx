"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Wallet, Lock } from "lucide-react";
import { NAV_ITEMS, ADMIN_NAV_ITEM } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MobileNavProps = {
  isAdmin?: boolean;
  plan?: string;
};

export function MobileNav({ isAdmin, plan = "free" }: MobileNavProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);

  const items = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="px-6 h-16 flex flex-row items-center justify-start border-b space-y-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <SheetTitle className="font-bold text-lg tracking-tight">MoneyFlow AI</SheetTitle>
          </div>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const locked = item.pro && plan === "free";
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1 truncate">{t(item.labelKey)}</span>
                {locked && <Lock className="h-3.5 w-3.5 shrink-0 opacity-50" />}
              </Link>
            );
          })}
        </nav>
        {plan === "free" && (
          <div className="p-3 border-t">
            <Link
              href="/settings#billing"
              onClick={() => setOpen(false)}
              className="flex flex-col gap-1 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t("settings.upgradeToPro") || "Upgrade to Pro"}</span>
                <Badge variant="default" className="text-[10px]">PRO</Badge>
              </div>
              <span className="text-muted-foreground">
                {t("settings.unlockAiFeatures") || "Unlock AI insights, forecasts & more"}
              </span>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
