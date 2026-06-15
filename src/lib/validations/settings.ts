import { z } from "zod";

export const CURRENCIES = ["THB", "USD", "EUR", "GBP", "JPY", "SGD", "AUD"] as const;

export const TIMEZONES = [
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Hong_Kong",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
] as const;

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  currency: z.enum(CURRENCIES),
  timezone: z.string().min(1, "Timezone is required"),
  locale: z.enum(["en", "th"]),
  theme: z.enum(["light", "dark", "system"]),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const subscriptionUpdateSchema = z.object({
  plan: z.enum(["free", "pro", "family"]),
});

export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
