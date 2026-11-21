"use client";
import * as React from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Vertical drag-to-reorder list (keyboard accessible: focus the handle, Space, arrows, Space). */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  className,
}: {
  items: T[];
  getId: (item: T) => string;
  onReorder: (next: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => getId(i) === e.active.id);
    const to = items.findIndex((i) => getId(i) === e.over!.id);
    onReorder(arrayMove(items, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map(getId)} strategy={verticalListSortingStrategy}>
        <ul className={cn("flex flex-col gap-2", className)}>
          {items.map((item, i) => (
            <Row key={getId(item)} id={getId(item)}>
              {renderItem(item, i)}
            </Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Row({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("flex items-stretch gap-2 rounded-btn bg-surface shadow-card", isDragging && "z-10 shadow-pop ring-2 ring-yellow-500")}>
      <button type="button" {...attributes} {...listeners} aria-label="Drag to reorder" className="grid w-9 shrink-0 cursor-grab place-items-center rounded-l-btn text-muted hover:bg-bg-2 active:cursor-grabbing">
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1 py-2 pr-3">{children}</div>
    </li>
  );
}
