import { notFound } from "next/navigation";

/** Catch-all so unknown localised URLs render the branded [locale]/not-found page. */
export default function CatchAll() {
  notFound();
}
