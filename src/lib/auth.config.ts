import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (used by middleware). No DB or bcrypt here.
 * The Credentials provider lives in ./auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: "ADMIN" | "BROKER" }).role ?? "BROKER";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "BROKER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
