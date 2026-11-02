"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { DESCRIPTION_MAX_LENGTH } from "@/features/catalogue/schemas";

export type FactsValues = {
  year: string;
  minPlayers: string;
  maxPlayers: string;
  playTimeMin: string;
  description: string;
};

export type FactsField = keyof FactsValues;

/** What the edit action returns. `values` puts the typed text back after an error. */
export type EditFactsState = {
  error: string | null;
  fieldErrors?: Partial<Record<FactsField, string>>;
  values?: FactsValues;
};

export function EditFactsForm({
  gameId,
  initial,
  action,
  cancel,
}: {
  gameId: string;
  initial: FactsValues;
  action: (
    previous: EditFactsState,
    formData: FormData,
  ) => Promise<EditFactsState>;
  cancel: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const values = state.values ?? initial;
  const errorFor = (field: FactsField) => state.fieldErrors?.[field] ?? null;
  const hasFieldErrors = Object.keys(state.fieldErrors ?? {}).length > 0;

  return (
    <form
      // Keyed so a failed save puts the typed values back.
      key={state.error ?? "ok"}
      action={formAction}
      className="flex max-w-md flex-col gap-6"
      noValidate
    >
      <input type="hidden" name="gameId" value={gameId} />
      <TextField
        label="Year"
        name="year"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={values.year}
        error={errorFor("year")}
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Minimum players"
          name="minPlayers"
          inputMode="numeric"
          autoComplete="off"
          defaultValue={values.minPlayers}
          error={errorFor("minPlayers")}
        />
        <TextField
          label="Maximum players"
          name="maxPlayers"
          inputMode="numeric"
          autoComplete="off"
          defaultValue={values.maxPlayers}
          error={errorFor("maxPlayers")}
        />
      </div>
      <TextField
        label="Play time (minutes)"
        name="playTimeMin"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={values.playTimeMin}
        error={errorFor("playTimeMin")}
      />
      <TextAreaField
        label="Description"
        name="description"
        maxLength={DESCRIPTION_MAX_LENGTH}
        defaultValue={values.description}
        error={errorFor("description")}
      />

      {state.error && !hasFieldErrors ? (
        <p role="alert" className="text-negative text-sm">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save facts"}
        </Button>
        {cancel}
      </div>
    </form>
  );
}
