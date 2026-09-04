import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/playfair-display";
import "./globals.css";

export const metadata: Metadata = {
  title: "RiskGate — Safety kernel for AI trading agents",
  description:
    "Put deterministic policy checks between an AI trading agent and Binance execution.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
