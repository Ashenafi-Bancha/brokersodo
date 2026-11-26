"use client";
import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type Table as TTable,
  type VisibilityState,
} from "@tanstack/react-table";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type { ColumnDef };

/** Generic admin data table: global search, sorting, column visibility, pagination, row selection. */
export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = "Search…",
  toolbar,
  bulkActions,
  pageSize = 25,
  getRowId,
  emptyText = "Nothing here yet.",
  initialVisibility,
  storageKey,
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  searchPlaceholder?: string;
  toolbar?: (table: TTable<T>) => React.ReactNode;
  bulkActions?: (rows: T[], clear: () => void) => React.ReactNode;
  pageSize?: number;
  getRowId?: (row: T) => string;
  emptyText?: string;
  initialVisibility?: VisibilityState;
  storageKey?: string;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialVisibility ?? {});

  // Remember column visibility per table (per-browser convenience)
  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(`bs:cols:${storageKey}`);
      if (raw) setColumnVisibility(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [storageKey]);
  React.useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(`bs:cols:${storageKey}`, JSON.stringify(columnVisibility));
    } catch {
      /* ignore */
    }
  }, [columnVisibility, storageKey]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId,
    enableRowSelection: !!bulkActions,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    globalFilterFn: "includesString",
  });

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1 sm:max-w-xs">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-h-10 w-full rounded-btn border-[1.5px] border-line bg-surface pr-3 pl-9 text-sm outline-none focus:border-[var(--input-focus)]"
          />
        </label>
        {toolbar?.(table)}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="outline" size="sm" className="ml-auto border-line">
              <Columns3 /> Columns
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-44 rounded-btn bg-surface p-1 shadow-pop">
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <DropdownMenu.CheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none data-[highlighted]:bg-bg-2"
                  >
                    <span className={cn("grid size-4 place-items-center rounded border", c.getIsVisible() ? "border-primary bg-primary text-on-primary" : "border-line-strong")}>
                      {c.getIsVisible() ? "✓" : ""}
                    </span>
                    {typeof c.columnDef.header === "string" ? c.columnDef.header : c.id}
                  </DropdownMenu.CheckboxItem>
                ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {bulkActions && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-btn bg-red-500 px-3 py-2 text-sm text-white">
          <span className="font-bold">{selected.length} selected</span>
          <span className="opacity-40">|</span>
          {bulkActions(selected, () => setRowSelection({}))}
        </div>
      )}

      <div className="overflow-x-auto rounded-card bg-surface shadow-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line bg-bg-2/60 text-left text-xs font-bold tracking-wide text-muted uppercase">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {bulkActions && (
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all on page"
                      className="size-4 accent-[var(--primary)]"
                      checked={table.getIsAllPageRowsSelected()}
                      ref={(el) => {
                        if (el) el.indeterminate = table.getIsSomePageRowsSelected();
                      }}
                      onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                  </th>
                )}
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-3 whitespace-nowrap" aria-sort={h.column.getIsSorted() === "asc" ? "ascending" : h.column.getIsSorted() === "desc" ? "descending" : undefined}>
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex cursor-pointer items-center gap-1 uppercase hover:text-fg">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc" ? <ArrowUp className="size-3" /> : h.column.getIsSorted() === "desc" ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-40" />}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (bulkActions ? 1 : 0)} className="px-3 py-12 text-center text-muted">
                  {emptyText}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className={cn("border-b border-line last:border-0 hover:bg-bg-2/50", row.getIsSelected() && "bg-yellow-50 dark:bg-navy-700/50")}>
                  {bulkActions && (
                    <td className="px-3 py-2.5">
                      <input type="checkbox" aria-label="Select row" className="size-4 accent-[var(--primary)]" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
                    </td>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>
          {table.getFilteredRowModel().rows.length} row{table.getFilteredRowModel().rows.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            aria-label="Rows per page"
            className="min-h-9 rounded-btn border border-line bg-surface px-2"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <Button variant="outline" size="icon-xs" className="border-line" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          <span>
            {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
          </span>
          <Button variant="outline" size="icon-xs" className="border-line" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Select filter bound to a column (used in toolbars). */
export function ColumnSelectFilter<T>({ table, column, label, options }: { table: TTable<T>; column: string; label: string; options: { value: string; label: string }[] }) {
  const col = table.getColumn(column);
  if (!col) return null;
  return (
    <select
      aria-label={label}
      value={(col.getFilterValue() as string) ?? ""}
      onChange={(e) => col.setFilterValue(e.target.value || undefined)}
      className="min-h-10 rounded-btn border-[1.5px] border-line bg-surface px-3 text-sm"
    >
      <option value="">{label}: all</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
