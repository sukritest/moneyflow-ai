"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet } from "lucide-react";
import { NAV_ITEMS, ADMIN_NAV_ITEM } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";

type SidebarProps = {
  isAdmin?: boolean;
  plan?: string;
};

export function Sidebar({ isAdmin, plan = "free" }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLocale();

  const items = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r bg-card/40 h-screen sticky top-0">
      <div className="flex items-center gap-2 px-6 h-16 border-b shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="h-5 w-5" />
        </div>
        <span className="font-bold text-lg tracking-tight">MoneyFlow AI</span>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 truncate">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-xs">
          <span className="font-medium">{t("settings.allFeaturesFree") || "All features unlocked"}</span>
          <Badge variant="success" className="text-[10px]">FREE</Badge>
        </div>
      </div>
    </aside>
  );
}
