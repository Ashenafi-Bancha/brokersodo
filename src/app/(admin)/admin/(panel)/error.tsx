"use client";
import * as React from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="font-brand text-4xl text-primary">Oops</p>
      <h1 className="mt-2 text-xl font-bold text-fg">This page hit an error</h1>
      <p className="mt-2 text-sm text-muted">{error.message?.includes("permission") || error.message?.includes("sign in") ? error.message : "Please try again. If it keeps happening, tell your admin."}</p>
      {error.digest && <p className="mt-1 font-mono text-xs text-muted">#{error.digest}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={reset} size="sm">
          <RotateCcw /> Try again
        </Button>
        <Button asChild variant="outline" size="sm" className="border-line">
          <Link href="/admin">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
