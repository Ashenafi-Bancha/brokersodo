"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { PasswordInput } from "@/components/ui/password-input";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/admin"} />
      <Field id="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field id="password" label="Password">
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      {state?.error && (
        <p role="alert" className="rounded-btn bg-red-50 px-3 py-2 text-sm font-medium text-error dark:bg-error/20 dark:text-red-200">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} block>
        {pending && <Loader2 className="animate-spin" />} Sign in
      </Button>
    </form>
  );
}
