import { Container } from "@/components/ui/misc";

/** Compact branded page header used by content pages. */
export function PageHero({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-bg text-fg">
      <div aria-hidden className="absolute inset-0 bg-pattern" />
      <Container className="relative py-12 sm:py-16">
        <h1 className="max-w-3xl font-brand text-h2">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-2xl text-lg text-fg-2">{subtitle}</p> : null}
        {children}
      </Container>
      <div aria-hidden className="relative h-2 bg-brand-gradient" />
    </section>
  );
}
