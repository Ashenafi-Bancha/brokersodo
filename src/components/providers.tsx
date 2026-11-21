"use client";
import { ThemeProvider } from "next-themes";

/** Reduced motion is handled globally in CSS (globals.css). The admin adds its own toast host. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false} storageKey="bs-theme" disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
