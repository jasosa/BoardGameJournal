import { PageHeader } from "@/components/shell/PageHeader";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export const metadata = { title: "Settings | Meeple Journal" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <section aria-labelledby="theme-heading">
        <h2 id="theme-heading" className="mb-3 text-xl">
          Theme
        </h2>
        <ThemeToggle />
      </section>
    </>
  );
}
