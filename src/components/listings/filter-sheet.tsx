"use client";
import { useTranslations } from "next-intl";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import type { ParsedParams } from "@/lib/listing-params";
import { FilterForm, type FiltersProps } from "./filters";

/** Mobile bottom sheet; loaded the first time a visitor taps "Filters". */
export function FilterSheet({
  open,
  onOpenChange,
  onApply,
  ...props
}: FiltersProps & { open: boolean; onOpenChange: (o: boolean) => void; onApply: (next: Partial<ParsedParams>) => void }) {
  const t = useTranslations("browse");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent title={t("filters")}>
        <div className="p-5">
          <FilterForm {...props} onApply={onApply} onDone={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Dialog>
  );
}
