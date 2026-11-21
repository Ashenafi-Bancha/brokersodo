import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "ADMIN" | "BROKER" } & DefaultSession["user"];
  }
  interface User {
    role?: "ADMIN" | "BROKER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "BROKER";
  }
}
