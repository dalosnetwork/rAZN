"use client";
"use no memo";

import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: DataTablePaginationProps<TData>) {
  const { tx } = useI18n();
  const pageCount = Math.max(1, table.getPageCount());

  return (
    <div className="flex items-center justify-between px-4">
      <div className="hidden flex-1 text-muted-foreground text-sm lg:flex">
        {tx(
          `${table.getFilteredSelectedRowModel().rows.length} of ${table.getRowCount()} row(s) selected.`,
          `${table.getFilteredSelectedRowModel().rows.length} / ${table.getRowCount()} satır seçildi.`,
          `${table.getFilteredSelectedRowModel().rows.length} из ${table.getRowCount()} строк выбрано.`,
        )}
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="font-medium text-sm">
            {tx("Rows per page", "Sayfa başına satır", "Строк на странице")}
          </Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center font-medium text-sm">
          {tx(
            `Page ${table.getState().pagination.pageIndex + 1} of ${pageCount}`,
            `${table.getState().pagination.pageIndex + 1} / ${pageCount}. sayfa`,
            `Страница ${table.getState().pagination.pageIndex + 1} из ${pageCount}`,
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{tx("Go to first page", "İlk sayfaya git", "Перейти на первую страницу")}</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{tx("Go to previous page", "Önceki sayfaya git", "Перейти на предыдущую страницу")}</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{tx("Go to next page", "Sonraki sayfaya git", "Перейти на следующую страницу")}</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{tx("Go to last page", "Son sayfaya git", "Перейти на последнюю страницу")}</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
