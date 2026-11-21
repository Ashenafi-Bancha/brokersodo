import "./globals.css";

/**
 * Pass-through root layout. The real <html> shells live in
 * app/[locale]/layout.tsx (public, localised) and app/(admin)/layout.tsx (staff).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
