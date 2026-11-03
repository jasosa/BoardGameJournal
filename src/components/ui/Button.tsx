type Variant = "primary" | "quiet";

const base =
  "duration-fast rounded-input inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium transition-[background-color,border-color] disabled:opacity-60";
const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent hover:bg-accent-strong focus-visible:outline-ink",
  quiet: "border-edge text-ink hover:border-accent border",
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
