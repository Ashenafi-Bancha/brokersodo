import NextAuth from "next-auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { routing } from "@/i18n/routing";

const { auth } = NextAuth(authConfig);
const intl = createIntlMiddleware(routing);

const adminGuard = auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isLogin = pathname === "/admin/login";
  if (!req.auth && !isLogin) {
    const url = new URL("/admin/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
  if (req.auth && isLogin) return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
});

/** Auth runs on /admin only: public pages stay cookie-free so CDNs and the back/forward cache can serve them. */
export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (adminGuard as unknown as (r: NextRequest, e: NextFetchEvent) => Promise<Response>)(req, event);
  }
  return intl(req);
}

export const config = {
  runtime: "nodejs",
  // Everything except API routes, Next internals, Vercel internals and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
