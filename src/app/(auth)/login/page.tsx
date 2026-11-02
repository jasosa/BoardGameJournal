import { LoginForm } from "@/components/auth/LoginForm";
import { signIn } from "./actions";

export const metadata = { title: "Sign in | Meeple Journal" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-12">
      <p className="font-display text-ink-soft mb-2 text-xl">Meeple Journal</p>
      <h1 className="mb-8 text-3xl">Sign in</h1>
      <LoginForm action={signIn} />
    </main>
  );
}
