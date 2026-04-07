import type { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical } from "lucide-react";
import type z from "zod";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";

import type { recentLeadSchema } from "./schema";

type TxFn = (en: string, tr: string) => string;

function translateLeadStatus(status: string, tx: TxFn) {
  if (status === "mint") return tx("Mint", "Mint");
  if (status === "redeem") return tx("Redeem", "Redeem");
  if (status === "Qualified") return tx("Qualified", "Nitelikli");
  if (status === "Negotiation") return tx("Negotiation", "Müzakere");
  if (status === "Proposal Sent") return tx("Proposal Sent", "Teklif Gönderildi");
  if (status === "Contacted") return tx("Contacted", "İletişime Geçildi");
  if (status === "Won") return tx("Won", "Kazanıldı");
  if (status === "New") return tx("New", "Yeni");
  if (status === "submitted") return tx("Submitted", "Gönderildi");
  if (status === "under_review") return tx("Under Review", "İncelemede");
  if (status === "processing") return tx("Processing", "İşleniyor");
  if (status === "approved") return tx("Approved", "Onaylandı");
  if (status === "completed") return tx("Completed", "Tamamlandı");
  if (status === "queued") return tx("Queued", "Sırada");
  if (status === "rejected") return tx("Rejected", "Reddedildi");
  return status;
}

function translateLeadSource(source: string, tx: TxFn) {
  if (source === "bank") return tx("Bank", "Banka");
  if (source === "swift") return "SWIFT";
  if (source === "crypto") return tx("Crypto", "Kripto");
  if (source === "direct") return tx("Direct", "Doğrudan");
  return source;
}

export function createCrmRequestColumns(
  tx: TxFn,
): ColumnDef<z.infer<typeof recentLeadSchema>>[] {
  return [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={tx("Select all", "Tümünü seç")}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={tx("Select row", "Satırı seç")}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => <DataTableColumnHeader column={column} title={tx("Ref", "Ref")} />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.id}</span>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title={tx("Type", "Tip")} />,
    cell: ({ row }) => (
      <span className="capitalize">{translateLeadStatus(row.original.type, tx)}</span>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={tx("Amount", "Tutar")} />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.amount, { noDecimals: true })}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title={tx("Status", "Durum")} />,
    cell: ({ row }) => <Badge variant="secondary">{translateLeadStatus(row.original.status, tx)}</Badge>,
    enableSorting: false,
  },
  {
    accessorKey: "source",
    header: ({ column }) => <DataTableColumnHeader column={column} title={tx("Source", "Kaynak")} />,
    cell: ({ row }) => <Badge variant="outline">{translateLeadSource(row.original.source, tx)}</Badge>,
    enableSorting: false,
  },
  {
    accessorKey: "lastActivity",
    header: ({ column }) => <DataTableColumnHeader column={column} title={tx("Last Activity", "Son Aktivite")} />,
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">{row.original.lastActivity}</span>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    cell: () => (
      <Button variant="ghost" className="flex size-8 text-muted-foreground" size="icon">
        <EllipsisVertical />
        <span className="sr-only">{tx("Open menu", "Menüyü aç")}</span>
      </Button>
    ),
    enableSorting: false,
  },
  ];
}
