import { PageHeader } from "@/components/shell/PageHeader";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { signOut } from "./actions";

export const metadata = { title: "Settings | Meeple Journal" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-10">
        <section aria-labelledby="theme-heading">
          <h2 id="theme-heading" className="mb-3 text-xl">
            Theme
          </h2>
          <ThemeToggle />
        </section>
        <section aria-labelledby="account-heading">
          <h2 id="account-heading" className="mb-3 text-xl">
            Account
          </h2>
          <form action={signOut}>
            <Button type="submit" variant="quiet">
              Sign out
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
