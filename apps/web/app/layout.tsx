import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";
import { AppShell } from "./app-shell";

export const metadata: Metadata = {
  title: "Smart Rounding",
  description: "Explainable rounding and compliance support for care teams",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
