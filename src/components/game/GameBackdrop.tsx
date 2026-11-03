import { isHexColour } from "@/features/catalogue/cover-colours";

/**
 * A soft glow of the cover's colour behind the game page, fixed to the viewport. Without a
 * colour (no cover, or a cover from before the colours existed) the page stays neutral. It is
 * decoration only; the text on it is checked for contrast when the colour is derived.
 */
export function GameBackdrop({ tint }: { tint: string | null }) {
  // Checked here too: the value goes straight into a CSS gradient.
  if (!isHexColour(tint)) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: `radial-gradient(ellipse 90% 70% at 20% 8%, color-mix(in srgb, ${tint} 92%, transparent), transparent 72%)`,
      }}
    />
  );
}
