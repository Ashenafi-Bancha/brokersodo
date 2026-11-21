"use client";
import * as React from "react";
import dynamic from "next/dynamic";

const Placeholder = () => <div aria-hidden className="min-h-[520px] animate-pulse rounded-btn bg-bg-2" />;
const InquiryForm = dynamic(() => import("./inquiry-form").then((m) => m.InquiryForm), { ssr: false, loading: Placeholder });

/** Downloads the form libraries only when the form is about to scroll into view. */
export function LazyInquiryForm(props: React.ComponentProps<typeof InquiryForm>) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref}>{show ? <InquiryForm {...props} /> : <Placeholder />}</div>;
}
