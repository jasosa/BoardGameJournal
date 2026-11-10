import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  DataSection,
  DataSectionSkeleton,
} from "@/components/account/DataSection";
import { SignOutForm } from "@/components/account/SignOutForm";
import { requireUser } from "@/server/authorization/require-user";
import { signOut } from "./actions";

export const metadata = { title: "Settings | Meeple Journal" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
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
        <Suspense fallback={<DataSectionSkeleton />}>
          <DataSection supabase={supabase} userId={user.id} />
        </Suspense>
      </div>
    </>
  );
}
