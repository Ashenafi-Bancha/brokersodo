"use client";
import * as React from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  /** Optional extra input (e.g. date for "Mark sold", reason for "Reject"). */
  input?: { type: "date" | "text" | "textarea"; label: string; defaultValue?: string; required?: boolean };
};

type Resolver = (value: { ok: boolean; value?: string }) => void;

const Ctx = React.createContext<(opts: ConfirmOptions) => Promise<{ ok: boolean; value?: string }>>(() => Promise.resolve({ ok: false }));

/** Promise-based confirmation dialog: `const ok = (await confirm({...})).ok` */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null);
  const [value, setValue] = React.useState("");
  const resolver = React.useRef<Resolver | null>(null);
  const confirm = React.useCallback((o: ConfirmOptions) => {
    setOpts(o);
    setValue(o.input?.defaultValue ?? "");
    return new Promise<{ ok: boolean; value?: string }>((res) => (resolver.current = res));
  }, []);
  const close = (ok: boolean) => {
    resolver.current?.({ ok, value });
    resolver.current = null;
    setOpts(null);
  };
  const invalid = !!opts?.input?.required && !value.trim();
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={!!opts} onOpenChange={(o) => !o && close(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-navy-900/60" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card bg-surface p-6 shadow-pop">
            <AlertDialog.Title className="text-lg font-bold text-fg">{opts?.title}</AlertDialog.Title>
            {opts?.description ? <AlertDialog.Description className="mt-2 text-sm text-muted">{opts.description}</AlertDialog.Description> : <AlertDialog.Description className="sr-only">{opts?.title}</AlertDialog.Description>}
            {opts?.input && (
              <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-fg">
                {opts.input.label}
                {opts.input.type === "textarea" ? (
                  <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} className="rounded-btn border-[1.5px] border-line-strong bg-bg p-3 font-normal" autoFocus />
                ) : (
                  <input type={opts.input.type} value={value} onChange={(e) => setValue(e.target.value)} className="min-h-11 rounded-btn border-[1.5px] border-line-strong bg-bg px-3 font-normal" autoFocus />
                )}
              </label>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <Button variant={opts?.destructive ? "destructive" : "primary"} size="sm" onClick={() => close(true)} disabled={invalid}>
                {opts?.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Ctx.Provider>
  );
}

export const useConfirm = () => React.useContext(Ctx);

/** Run a server action with toast feedback. */
export function useRunAction() {
  const [pending, start] = React.useTransition();
  const run = React.useCallback(
    <T,>(fn: () => Promise<{ ok: boolean; error?: string; message?: string; data?: T }>, onOk?: (data?: T) => void) =>
      start(async () => {
        const { toast } = await import("sonner");
        const res = await fn();
        if (res.ok) {
          if (res.message) toast.success(res.message);
          onOk?.(res.data);
        } else toast.error(res.error ?? "Something went wrong");
      }),
    [],
  );
  return { run, pending };
}

export function Spinner() {
  return <Loader2 className="size-4 animate-spin" />;
}
