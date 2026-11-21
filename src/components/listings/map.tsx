"use client";
import "leaflet/dist/leaflet.css";
import * as React from "react";
import L from "leaflet";
import { Circle, CircleMarker, MapContainer, TileLayer, useMapEvents, Tooltip } from "react-leaflet";

export type MapProps = {
  lat: number;
  lng: number;
  zoom?: number;
  /** Privacy circle radius in metres (listing maps). */
  radius?: number;
  /** Show a point marker (office location only — never for listings). */
  marker?: boolean;
  label?: string;
  interactive?: boolean;
};

const TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export default function LeafletMap({ lat, lng, zoom = 14, radius, marker, label, interactive = true }: MapProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      dragging={interactive && !L.Browser.mobile}
      touchZoom={interactive}
      zoomControl={interactive}
      attributionControl
      className="size-full"
    >
      <TileLayer url={TILE} attribution={ATTR} />
      {radius ? (
        <Circle center={[lat, lng]} radius={radius} pathOptions={{ color: "#E30613", fillColor: "#FFC20E", fillOpacity: 0.3, weight: 2 }} />
      ) : null}
      {marker ? (
        <CircleMarker center={[lat, lng]} radius={10} pathOptions={{ color: "#FFFFFF", weight: 3, fillColor: "#E30613", fillOpacity: 1 }}>
          {label ? <Tooltip direction="top" offset={[0, -8]}>{label}</Tooltip> : null}
        </CircleMarker>
      ) : null}
    </MapContainer>
  );
}

/** Admin: click the map to set the approximate location. */
export function LeafletPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = [lat ?? 6.8556, lng ?? 37.7508];
  return (
    <MapContainer center={center} zoom={14} scrollWheelZoom className="size-full">
      <TileLayer url={TILE} attribution={ATTR} />
      <ClickHandler onChange={onChange} />
      {lat != null && lng != null ? (
        <Circle center={[lat, lng]} radius={400} pathOptions={{ color: "#E30613", fillColor: "#FFC20E", fillOpacity: 0.3 }} />
      ) : null}
    </MapContainer>
  );
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5)));
    },
  });
  return null;
}
