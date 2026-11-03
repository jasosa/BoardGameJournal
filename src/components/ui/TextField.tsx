import { useId } from "react";

export function TextField({
  label,
  hint,
  error,
  ...props
}: Omit<React.ComponentProps<"input">, "id"> & {
  label: string;
  hint?: string;
  /** Message for this field. Linked to the input for screen readers. */
  error?: string | null;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [errorId, hintId].filter(Boolean).join(" ") || undefined
        }
        className="border-edge bg-canvas text-ink rounded-input min-h-11 border px-3 text-base"
      />
      {error ? (
        <p id={errorId} role="alert" className="text-negative text-sm">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="text-ink-soft text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
