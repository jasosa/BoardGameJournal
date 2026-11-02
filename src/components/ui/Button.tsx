type Variant = "primary" | "quiet";

const base =
  "duration-fast rounded-input inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium transition-[background-color,border-color] disabled:opacity-60";
const variants: Record<Variant, string> = {
  primary:
    "bg-bronze text-on-bronze hover:bg-bronze-deep focus-visible:outline-ink",
  quiet: "border-line text-ink hover:border-bronze border",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${className}`}
    />
  );
}
