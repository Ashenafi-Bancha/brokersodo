import "server-only";
import NextAuth, { type Session } from "next-auth";
import { redirect } from "next/navigation";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { loginSchema } from "@/lib/validators/admin";
import { rateLimit } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const rl = await rateLimit(`login:${email}`, 8, 15 * 60);
        if (!rl.ok) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
          await bcrypt.compare(password, await dummyHash()); // equalise timing
          return null;
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, name: user.name, email: user.email, role: user.role, image: user.avatar };
      },
    }),
  ],
});

let _dummy: Promise<string> | null = null;
const dummyHash = () => (_dummy ??= bcrypt.hash("timing-equaliser", 12));

export type Role = "ADMIN" | "BROKER";
export type StaffSession = Session & { user: { id: string; role: Role; name?: string | null; email?: string | null } };

export class AuthError extends Error {
  constructor(message = "Not authorised") {
    super(message);
    this.name = "AuthError";
  }
}

/** Server-side guard for every admin page and action. Re-checks the DB so deactivated staff lose access at once. */
export async function requireStaff(roles: Role[] = ["ADMIN", "BROKER"]): Promise<StaffSession> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError("Please sign in");
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { isActive: true, role: true } });
  if (!user?.isActive) throw new AuthError("Account disabled");
  if (!roles.includes(user.role)) throw new AuthError("You don't have permission to do that");
  session.user.role = user.role;
  return session as StaffSession;
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);

/** For admin pages: redirect instead of throwing when the role isn't allowed. */
export async function requireStaffPage(roles: Role[] = ["ADMIN", "BROKER"]): Promise<StaffSession> {
  try {
    return await requireStaff(roles);
  } catch {
    redirect("/admin?denied=1");
  }
}
