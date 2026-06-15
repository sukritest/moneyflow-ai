import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Returns the currently logged-in Supabase user, or null.
 */
export async function getSupabaseUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/**
 * Returns the app-level User row for the current session, creating it on
 * first login (lazy provisioning). Returns null if not authenticated.
 *
 * This keeps a 1:1 mapping between Supabase auth users and our Prisma
 * `User` model so we can store app-specific fields (locale, currency,
 * subscription, etc.) without duplicating the auth system.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supaUser = await getSupabaseUser();
  if (!supaUser) return null;

  let user = await prisma.user.findUnique({ where: { supabaseId: supaUser.id } });

  if (!user) {
    // Fallback match by email in case the row was seeded/created separately
    user = await prisma.user.findUnique({ where: { email: supaUser.email ?? "" } });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        supabaseId: supaUser.id,
        email: supaUser.email ?? `user-${supaUser.id}@unknown.local`,
        name:
          (supaUser.user_metadata?.full_name as string | undefined) ??
          (supaUser.user_metadata?.name as string | undefined) ??
          null,
        avatarUrl: (supaUser.user_metadata?.avatar_url as string | undefined) ?? null,
      },
    });

    // Give every new user a default wallet + subscription record
    await prisma.wallet.create({
      data: {
        userId: user.id,
        name: "Main Wallet",
        type: "personal",
        currency: user.currency,
        isDefault: true,
      },
    });
    await prisma.subscription.create({
      data: { userId: user.id, plan: "free" },
    });
  } else if (!user.supabaseId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { supabaseId: supaUser.id },
    });
  }

  return user;
}

/**
 * For local development without Supabase configured, returns (and lazily
 * creates) a demo user so every page is browsable without auth.
 */
export async function getDemoUser(): Promise<User> {
  let user = await prisma.user.findUnique({ where: { email: "demo@moneyflow.ai" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "demo@moneyflow.ai",
        name: "Demo User",
        locale: "en",
        currency: "THB",
        onboarded: true,
      },
    });
    await prisma.wallet.create({
      data: { userId: user.id, name: "Main Wallet", type: "personal", currency: "THB", isDefault: true },
    });
    await prisma.subscription.create({ data: { userId: user.id, plan: "pro" } });
  }
  return user;
}

/**
 * Resolves the active app user: real Supabase user if configured & logged
 * in, otherwise the demo user. Use this in Server Components/route handlers
 * so the app degrades gracefully without auth configured.
 */
export async function getActiveUser(): Promise<User> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const user = await getCurrentUser();
    if (user) return user;
  }
  return getDemoUser();
}
