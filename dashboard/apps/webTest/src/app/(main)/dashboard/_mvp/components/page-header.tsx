"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type MvpPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function MvpPageHeader({
  title,
  description,
  actions,
  className,
}: MvpPageHeaderProps) {
  const { tt } = useI18n();

  return (
    <header
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">{tt(title)}</h1>
        {description ? (
          <p className="max-w-3xl text-muted-foreground text-sm">
            {tt(description)}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
