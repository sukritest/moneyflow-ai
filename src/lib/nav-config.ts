import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Target,
  TrendingUp,
  CalendarClock,
  RefreshCw,
  ScanLine,
  Sparkles,
  MessageCircle,
  Gift,
  Users,
  Settings,
  ShieldCheck,
  PiggyBank,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom nav (limited to ~5 items) */
  primary?: boolean;
  /** Requires Pro/Family subscription */
  pro?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, primary: true },
  { href: "/transactions", labelKey: "nav.transactions", icon: Receipt, primary: true },
  { href: "/budgets", labelKey: "nav.budgets", icon: Wallet, primary: true },
  { href: "/goals", labelKey: "nav.goals", icon: Target, primary: true },
  { href: "/forecast", labelKey: "nav.forecast", icon: TrendingUp },
  { href: "/calendar", labelKey: "nav.calendar", icon: CalendarClock },
  { href: "/recurring", labelKey: "nav.recurring", icon: RefreshCw },
  { href: "/receipts", labelKey: "nav.receipts", icon: ScanLine },
  { href: "/insights", labelKey: "nav.insights", icon: Sparkles },
  { href: "/chat", labelKey: "nav.chat", icon: MessageCircle, primary: true },
  { href: "/salary", labelKey: "nav.salary", icon: PiggyBank },
  { href: "/emergency", labelKey: "nav.emergency", icon: ShieldAlert },
  { href: "/wrapped", labelKey: "nav.wrapped", icon: Gift },
  { href: "/family", labelKey: "nav.family", icon: Users },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  labelKey: "nav.admin",
  icon: ShieldCheck,
};
