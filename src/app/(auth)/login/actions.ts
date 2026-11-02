"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { LoginState } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/database/server";

const signInInput = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
});

export async function signIn(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = signInInput.safeParse({
    email,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter your email and password.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // One message for every failure, so the form never says which part was wrong.
    return { error: "Email or password is incorrect.", email };
  }
  redirect("/");
}
