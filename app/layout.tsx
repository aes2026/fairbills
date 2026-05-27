import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FairBills — Stop paying the loyalty tax on power",
  description:
    "Free Australian tool that checks your electricity bill against every plan from all 77 retailers, then hands you the script to switch or get a better rate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" className="h-full antialiased">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
