import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rosie Atelier",
  description: "Pattern, design, creativity and lifestyle.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The real <html>/<body> shell is owned by each locale layout (app/[locale]/layout.tsx).
  // This root layout exists only to satisfy Next.js's layout hierarchy requirement.
  return <>{children}</>;
}