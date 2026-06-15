import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Notification } from "@prisma/client";

type TopbarProps = {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    role: string;
  };
  plan?: string;
  notifications?: Notification[];
};

export function Topbar({ user, plan = "free", notifications = [] }: TopbarProps) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 lg:px-6">
      <MobileNav isAdmin={user.role === "admin"} plan={plan} />

      <div className="flex-1" />

      <Button asChild size="sm" className="hidden sm:inline-flex">
        <Link href="/transactions?new=1">
          <Plus className="mr-1.5 h-4 w-4" />
          Add transaction
        </Link>
      </Button>
      <Button asChild size="icon" className="sm:hidden">
        <Link href="/transactions?new=1" aria-label="Add transaction">
          <Plus className="h-5 w-5" />
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-[1.1rem] w-[1.1rem]" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up 🎉
            </div>
          ) : (
            notifications.slice(0, 6).map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 whitespace-normal">
                <span className="text-sm font-medium">{n.title}</span>
                <span className="text-xs text-muted-foreground">{n.body}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <LanguageSwitcher />
      <ThemeToggle />
      <UserMenu name={user.name} email={user.email} avatarUrl={user.avatarUrl} plan={plan} />
    </header>
  );
}
