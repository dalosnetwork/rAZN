"use client";
"use no memo";

import { useMemo } from "react";
import { Download } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { createCrmRequestColumns } from "./columns.crm";
import { useCrmMetrics } from "./use-crm-metrics";

export function TableCards() {
  const { tx, language } = useI18n();
  const locale =
    language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : language === "az" ? "az-AZ" : "en-US";
  const { recentRequestRows } = useCrmMetrics(locale);
  const recentLeadsColumns = useMemo(() => createCrmRequestColumns(tx), [tx]);
  const table = useDataTableInstance({
    data: recentRequestRows,
    columns: recentLeadsColumns,
    getRowId: (row) => row.id.toString(),
  });

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs">
      <Card>
        <CardHeader>
          <CardTitle>{tx("Recent Requests", "Son Talepler")}</CardTitle>
          <CardDescription>{tx("Track recent mint and redeem requests with status and source.", "Durum ve kaynak bilgisiyle son mint ve redeem taleplerini takip edin.")}</CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
              <DataTableViewOptions table={table} />
              <Button variant="outline" size="sm">
                <Download />
                <span className="hidden lg:inline">{tx("Export", "Dışa Aktar")}</span>
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex size-full flex-col gap-4">
          <div className="overflow-hidden rounded-md border">
            <DataTable table={table} columns={recentLeadsColumns} />
          </div>
          <DataTablePagination table={table} />
        </CardContent>
      </Card>
    </div>
  );
}
