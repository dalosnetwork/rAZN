"use client";
"use no memo";

import { useSortable } from "@dnd-kit/sortable";
import type { ColumnDef } from "@tanstack/react-table";
import { GripVertical } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";

function DragHandle({ id }: { id: number }) {
  const { tx } = useI18n();
  const { attributes, listeners } = useSortable({
    id,
  });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <GripVertical className="size-3 text-muted-foreground" />
      <span className="sr-only">{tx("Drag to reorder", "Yeniden sıralamak için sürükle", "Перетащите, чтобы изменить порядок")}</span>
    </Button>
  );
}

export const dragColumn: ColumnDef<any> = {
  id: "drag",
  header: () => null,
  cell: ({ row }) => <DragHandle id={row.original.id} />,
  enableSorting: false,
  enableHiding: false,
};
