import type { Metadata, Viewport } from "next";
import { Inter, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-schibsted",
});

export const metadata: Metadata = {
  title: "Meeple Journal",
  description: "A personal board-game library and journal.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${schibsted.variable}`}>
      <body>{children}</body>
    </html>
  );
}
