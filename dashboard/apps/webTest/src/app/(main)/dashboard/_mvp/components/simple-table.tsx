"use client";

import * as React from "react";

import type { ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";

import { MvpEmptyState } from "./empty-state";

export type MvpTableColumn<T> = {
  id: string;
  header: string;
  className?: string;
  cell: (row: T) => ReactNode;
};

type MvpSimpleTableProps<T> = {
  columns: MvpTableColumn<T>[];
  data: readonly T[];
  getRowId: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  enablePagination?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
};

export function MvpSimpleTable<T>({
  columns,
  data,
  getRowId,
  emptyTitle = "No records",
  emptyDescription = "Try adjusting filters or create a new item.",
  className,
  enablePagination = true,
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
}: MvpSimpleTableProps<T>) {
  const { tt } = useI18n();
  const rowsPerPageId = React.useId();
  const totalRows = data.length;

  const normalizedPageSizeOptions = React.useMemo(() => {
    const unique = Array.from(
      new Set(pageSizeOptions.filter((value) => Number.isFinite(value) && value > 0)),
    );
    unique.sort((a, b) => a - b);
    return unique.length > 0 ? unique : [10];
  }, [pageSizeOptions]);
  const defaultPageSize = React.useMemo(() => {
    return Number.isFinite(initialPageSize) && initialPageSize > 0
      ? Math.floor(initialPageSize)
      : normalizedPageSizeOptions[0];
  }, [initialPageSize, normalizedPageSizeOptions]);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);

  React.useEffect(() => {
    setPageSize(defaultPageSize);
    setPageIndex(0);
  }, [defaultPageSize]);

  const resolvedPageSizeOptions = React.useMemo(() => {
    if (normalizedPageSizeOptions.includes(pageSize)) {
      return normalizedPageSizeOptions;
    }
    const merged = [...normalizedPageSizeOptions, pageSize];
    merged.sort((a, b) => a - b);
    return merged;
  }, [normalizedPageSizeOptions, pageSize]);
  const totalPages = enablePagination
    ? Math.max(1, Math.ceil(totalRows / pageSize))
    : 1;

  React.useEffect(() => {
    if (pageIndex > totalPages - 1) {
      setPageIndex(totalPages - 1);
    }
  }, [pageIndex, totalPages]);

  if (!totalRows) {
    return (
      <MvpEmptyState
        title={tt(emptyTitle)}
        description={tt(emptyDescription)}
      />
    );
  }

  const hasPagination = enablePagination && totalRows > pageSize;
  const pageStart = pageIndex * pageSize;
  const pagedData =
    enablePagination
      ? data.slice(pageStart, pageStart + pageSize)
      : data;
  const rangeFrom = pageStart + 1;
  const rangeTo = pageStart + pagedData.length;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id} className={column.className}>
                  {tt(column.header)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedData.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {hasPagination ? (
        <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {tt("Showing")} {rangeFrom}–{rangeTo} {tt("of")} {totalRows}
          </p>
          <div className="flex items-center gap-2">
            <Label htmlFor={rowsPerPageId} className="sr-only">
              {tt("Rows per page")}
            </Label>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                const parsed = Number(value);
                if (!Number.isFinite(parsed) || parsed < 1) {
                  return;
                }
                setPageSize(parsed);
                setPageIndex(0);
              }}
            >
              <SelectTrigger
                id={rowsPerPageId}
                className="h-8 w-[92px]"
              >
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {resolvedPageSizeOptions.map((option) => (
                  <SelectItem key={option} value={`${option}`}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {tt("Page")} {pageIndex + 1} {tt("of")} {totalPages}
            </p>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPageIndex((previous) => Math.max(0, previous - 1))}
              disabled={pageIndex <= 0}
            >
              <ChevronLeftIcon className="size-4" />
              <span className="sr-only">{tt("Previous page")}</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                setPageIndex((previous) => Math.min(totalPages - 1, previous + 1))
              }
              disabled={pageIndex >= totalPages - 1}
            >
              <ChevronRightIcon className="size-4" />
              <span className="sr-only">{tt("Next page")}</span>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
