import type { ComponentProps } from "react";
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

const nav = createNavigation(routing);

export const { redirect, usePathname, useRouter, getPathname } = nav;

/**
 * Locale-aware link. Prefetch is off by default: most visitors are on slow, metered
 * 3G/4G, so we only download a page when it is actually opened.
 */
export function Link(props: ComponentProps<typeof nav.Link>) {
  return <nav.Link prefetch={false} {...props} />;
}
