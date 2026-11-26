"use client";
import { ThemeProvider } from "next-themes";

/** Reduced motion is handled globally in CSS (globals.css). The admin adds its own toast host. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // White theme only: no switch, and earlier "dark" choices saved in the browser are ignored.
    <ThemeProvider attribute="data-theme" forcedTheme="light" defaultTheme="light" enableSystem={false} storageKey="bs-theme" disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
