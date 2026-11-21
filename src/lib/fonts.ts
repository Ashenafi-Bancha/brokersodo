import { Inter, Montserrat, Noto_Sans_Ethiopic } from "next/font/google";

/** Brand kit fonts: Montserrat 900 Italic (display), Inter (body), Noto Sans Ethiopic (Amharic). */
// Variable font: one file covers every weight (fewer requests on slow 3G/4G).
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  // Not preloaded: at 48 KB it would compete with the first photo and headline on slow networks.
  preload: false,
  display: "swap",
});

export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["900"],
  style: ["italic"],
  variable: "--font-montserrat",
  // "optional": no late re-paint of the hero headline on slow networks (protects LCP);
  // the font is preloaded and cached, so it shows on fast connections and every repeat visit.
  display: "optional",
});

export const notoEthiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  weight: ["400", "700", "900"],
  variable: "--font-noto-ethiopic",
  display: "swap",
  preload: false,
});

export const fontVariables = `${inter.variable} ${montserrat.variable} ${notoEthiopic.variable}`;
