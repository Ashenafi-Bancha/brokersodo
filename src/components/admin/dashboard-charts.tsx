"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Single-series charts (one brand hue each, so no legend — the card title names the series).
 * Thin bars, 4px rounded data-ends, recessive grid, hover tooltip, text in text tokens.
 */
const axis = { stroke: "var(--fg-muted)", fontSize: 12, tickLine: false, axisLine: false } as const;

function TooltipBox({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-btn bg-surface px-3 py-2 text-sm shadow-pop">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-bold text-fg tabular-nums">
        {payload[0].value.toLocaleString()} {unit}
      </p>
    </div>
  );
}

export function InquiriesChart({ data }: { data: { day: string; count: number }[] }) {
  return (
    <div className="h-64" role="img" aria-label={`Inquiries per day, last ${data.length} days. Total ${data.reduce((s, d) => s + d.count, 0)}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="day" {...axis} interval="preserveStartEnd" minTickGap={24} />
          <YAxis allowDecimals={false} {...axis} width={40} />
          <Tooltip cursor={{ fill: "var(--bg-2)" }} content={<TooltipBox unit="inquiries" />} />
          <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <div style={{ height: Math.max(180, data.length * 34) }} role="img" aria-label={`Listings by category: ${data.map((d) => `${d.name} ${d.count}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis type="number" allowDecimals={false} {...axis} />
          <YAxis type="category" dataKey="name" {...axis} width={130} />
          <Tooltip cursor={{ fill: "var(--bg-2)" }} content={<TooltipBox unit="active listings" />} />
          <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
