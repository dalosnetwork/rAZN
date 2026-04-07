"use client";

import type { ReactNode } from "react";

import { SearchIcon } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MvpTableToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function MvpTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  actions,
  className,
}: MvpTableToolbarProps) {
  const { tt } = useI18n();

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-background p-3 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-xs">
          <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-8"
            placeholder={tt(searchPlaceholder)}
          />
        </div>
        {filters ? <div className="flex flex-wrap gap-2">{filters}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
