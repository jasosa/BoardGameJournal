"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { FormState } from "@/components/ui/form-state";

/** The email is echoed back after a failure. The password never is. */
export type LoginState = FormState & { email?: string };

export function LoginForm({
  action,
}: {
  action: (previous: LoginState, formData: FormData) => Promise<LoginState>;
}) {
  const [state, formAction, pending] = useActionState(action, {
    error: null,
  });
  return (
    <form
      key={`${state.email ?? ""}|${state.error ?? ""}`}
      action={formAction}
      className="flex flex-col gap-4"
      noValidate
    >
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.email ?? ""}
        required
        autoFocus
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state.error ? (
        <p role="alert" className="text-negative text-sm">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}
