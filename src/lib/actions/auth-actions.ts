"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LoginInput, RegisterInput, ForgotPasswordInput } from "@/lib/validations/auth";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function signOutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Supabase not configured (demo mode) — nothing to sign out of.
  }
  redirect("/login");
}

export async function loginAction(
  input: LoginInput
): Promise<{ error?: string }> {
  if (!SUPABASE_CONFIGURED) {
    return {
      error:
        "Supabase isn't configured yet, so the app is running in demo mode. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable real sign-in.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function registerAction(
  input: RegisterInput
): Promise<{ error?: string; success?: string }> {
  if (!SUPABASE_CONFIGURED) {
    return {
      error:
        "Supabase isn't configured yet, so the app is running in demo mode. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable account creation.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    success: "Check your email to confirm your account before logging in.",
  };
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput
): Promise<{ error?: string; success?: string }> {
  if (!SUPABASE_CONFIGURED) {
    return {
      error:
        "Supabase isn't configured yet, so the app is running in demo mode. Password reset requires Supabase to be configured.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback?next=/settings`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Password reset link sent. Check your inbox." };
}
