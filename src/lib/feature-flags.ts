import { prisma } from "@/lib/prisma";

export const DEFAULT_FEATURE_FLAGS = [
  {
    key: "ai_chat",
    label: "AI Assistant",
    description: "Conversational AI assistant for spending questions and advice.",
    enabled: true,
    rolloutPct: 100,
  },
  {
    key: "receipts_ocr",
    label: "Receipt Scanning",
    description: "Scan and auto-fill transactions from receipt photos.",
    enabled: true,
    rolloutPct: 100,
  },
  {
    key: "cashflow_forecast",
    label: "Cashflow Forecast",
    description: "Projected income, expenses, and balance for upcoming months.",
    enabled: true,
    rolloutPct: 100,
  },
  {
    key: "emergency_mode",
    label: "Emergency Mode",
    description: "Survival budget and cash runway planning for tough months.",
    enabled: true,
    rolloutPct: 50,
  },
  {
    key: "family_sharing",
    label: "Family Sharing",
    description: "Shared wallets and family groups.",
    enabled: true,
    rolloutPct: 100,
  },
  {
    key: "monthly_wrapped",
    label: "Monthly Wrapped",
    description: "Shareable monthly recap of spending and savings.",
    enabled: true,
    rolloutPct: 100,
  },
] as const;

/**
 * Returns all feature flags, lazily seeding the defaults on first run so
 * the admin panel always has something to show.
 */
export async function getOrSeedFeatureFlags() {
  const count = await prisma.featureFlag.count();
  if (count === 0) {
    await prisma.featureFlag.createMany({ data: [...DEFAULT_FEATURE_FLAGS] });
  }
  return prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
}
