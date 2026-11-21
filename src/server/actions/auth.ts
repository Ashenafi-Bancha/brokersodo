"use server";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { loginSchema } from "@/lib/validators/admin";

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your email and password." };
  const raw = String(formData.get("callbackUrl") || "/admin");
  // Only allow internal admin redirects (no open redirect).
  const redirectTo = raw.startsWith("/admin") && !raw.startsWith("//") ? raw : "/admin";
  try {
    await signIn("credentials", { ...parsed.data, redirectTo });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Wrong email or password, or too many attempts. Try again in a few minutes." };
    throw e; // NEXT_REDIRECT
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/admin/login" });
}
