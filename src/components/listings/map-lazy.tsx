"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { MapProps } from "./map";

const LeafletMap = dynamic(() => import("./map"), { ssr: false, loading: () => <MapPlaceholder /> });
const LeafletPicker = dynamic(() => import("./map").then((m) => m.LeafletPicker), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

function MapPlaceholder() {
  return (
    <div className="grid size-full place-items-center bg-bg-2 bg-pattern">
      <MapPin className="size-8 text-muted" aria-hidden />
    </div>
  );
}

/** Loads Leaflet only when the map scrolls into view (keeps initial JS small). */
export function StaticMap(props: MapProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="size-full">
      {visible ? <LeafletMap {...props} /> : <MapPlaceholder />}
    </div>
  );
}

export function MapPicker(props: { lat: number | null; lng: number | null; onChange: (lat: number, lng: number) => void }) {
  return <LeafletPicker {...props} />;
}
