/**
 * Tailwind v4 targets recent browsers only. The two steps after it let the site work on
 * older phones too (see the browserslist in package.json):
 *  - postcss-preset-env: flattens @layer, rewrites :is(), adds colour fallbacks, etc.
 *  - postcss-legacy.cjs: fallbacks Tailwind v4 needs that preset-env does not provide.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-preset-env": {
      // Only the features the browserslist targets actually need are applied.
      autoprefixer: { flexbox: "no-2009", grid: false },
      features: {
        // Variables are supported by every browser we target; leave them as they are.
        "custom-properties": false,
      },
    },
    "./postcss-legacy.cjs": {},
  },
};

export default config;
