import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meeple Journal",
  description: "A personal board-game library and journal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
