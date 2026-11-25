import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const dockerBuild = process.env.DOCKER_BUILD === "1";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Docker image: small self-contained server. Lint and types are checked before pushing.
  ...(dockerBuild ? { output: "standalone" as const, eslint: { ignoreDuringBuilds: true }, typescript: { ignoreBuildErrors: true } } : {}),
  // Files read at runtime by the per-listing Open Graph image route.
  outputFileTracingIncludes: {
    "/**/opengraph-image*": [
      "./node_modules/@fontsource/montserrat/files/montserrat-latin-900-italic.woff",
      "./node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
      "./public/brand/logo-horizontal.png",
      "./public/placeholders/**",
    ],
  },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1600],
  },
  experimental: {
    webpackMemoryOptimizations: true,
    // Docker builds run on small build servers: one worker keeps peak memory low.
    ...(dockerBuild ? { cpus: 1, webpackBuildWorker: false } : {}),
    serverActions: {
      bodySizeLimit: "12mb",
      allowedOrigins: ["brokersodo.com", "www.brokersodo.com", "*.app.aletcloud.com"],
    },
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
