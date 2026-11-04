"use client";

import { Button } from "@/components/ui/Button";
import { clearAllThoughtDrafts } from "@/features/thoughts/drafts";

/**
 * The Sign out button. Unsaved thought drafts live in this browser, so they are cleared before
 * the person leaves, and the next account on a shared device does not see them.
 */
export function SignOutForm({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action} onSubmit={() => clearAllThoughtDrafts()}>
      <Button type="submit" variant="quiet">
        Sign out
      </Button>
    </form>
  );
}
