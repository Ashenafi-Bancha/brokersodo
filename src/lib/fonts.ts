import localFont from "next/font/local";

/**
 * Brand kit fonts: Montserrat 900 Italic (display), Inter (body), Noto Sans Ethiopic (Amharic).
 * The font files live in src/fonts (SIL Open Font License, from Fontsource), so the build never
 * needs to reach Google Fonts. Some build servers cannot.
 */

// Variable font: one file covers every weight (fewer requests on slow 3G/4G).
export const inter = localFont({
  src: "../fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  // Not preloaded: at 48 KB it would compete with the first photo and headline on slow networks.
  preload: false,
  display: "swap",
  fallback: ["system-ui", "Arial", "sans-serif"],
});

export const montserrat = localFont({
  src: "../fonts/montserrat-latin-900-italic.woff2",
  weight: "900",
  style: "italic",
  variable: "--font-montserrat",
  // "optional": no late re-paint of the hero headline on slow networks (protects LCP);
  // the font is preloaded and cached, so it shows on fast connections and every repeat visit.
  display: "optional",
  fallback: ["Arial Black", "Arial", "sans-serif"],
});

export const notoEthiopic = localFont({
  src: [
    { path: "../fonts/noto-sans-ethiopic-ethiopic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/noto-sans-ethiopic-ethiopic-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/noto-sans-ethiopic-ethiopic-900-normal.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-noto-ethiopic",
  display: "swap",
  preload: false,
});

export const fontVariables = `${inter.variable} ${montserrat.variable} ${notoEthiopic.variable}`;
