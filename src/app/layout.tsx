import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sofra — open-source QR menu & table service",
  description:
    "Turn every table into a live QR menu: instant updates, multilingual, call waiter, request bill, order and pay — self-hosted, no commission.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
