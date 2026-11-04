import { PageHeader } from "@/components/shell/PageHeader";
import { SignOutForm } from "@/components/account/SignOutForm";
import { signOut } from "./actions";

export const metadata = { title: "Settings | Meeple Journal" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-10">
        <section aria-labelledby="account-heading">
          <h2 id="account-heading" className="mb-3 text-xl">
            Account
          </h2>
          <SignOutForm action={signOut} />
        </section>
      </div>
    </>
  );
}
