"use client";

import type { ReactNode } from "react";

import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { MvpStatus } from "../types";
import { StatusBadge } from "./status-badge";

type MvpKpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  trend?: {
    value: string;
    direction: "up" | "down";
  };
  status?: MvpStatus;
  action?: ReactNode;
  className?: string;
  flipOnHover?: boolean;
  backContent?: ReactNode;
};

export function MvpKpiCard({
  label,
  value,
  hint,
  trend,
  status,
  action,
  className,
  flipOnHover = false,
  backContent,
}: MvpKpiCardProps) {
  const { tt } = useI18n();
  const baseCardClassName =
    "@container/card gap-2 bg-linear-to-t from-primary/5 to-card shadow-xs dark:bg-card";
  const frontContent = (
    <CardHeader className="gap-1">
      <CardDescription>{tt(label)}</CardDescription>
      <CardTitle className="font-semibold text-lg @[250px]/card:text-2xl tabular-nums">
        {tt(value)}
      </CardTitle>
      <div className="flex flex-wrap items-center gap-2">
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
              trend.direction === "up"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUpIcon className="size-3.5" />
            ) : (
              <TrendingDownIcon className="size-3.5" />
            )}
            {tt(trend.value)}
          </span>
        ) : null}
        {status ? <StatusBadge status={status} /> : null}
        {action}
      </div>
      {hint ? (
        <p className="text-muted-foreground text-xs">{tt(hint)}</p>
      ) : null}
    </CardHeader>
  );

  if (!flipOnHover || !backContent) {
    return <Card className={cn(baseCardClassName, className)}>{frontContent}</Card>;
  }

  return (
    <div className={cn("group", className)}>
      <div className="relative overflow-hidden transition-transform duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none group-hover:scale-[1.04]">
        <Card
          className={cn(
            baseCardClassName,
            "transition-opacity duration-300 ease-out motion-reduce:opacity-100 motion-reduce:transition-none group-hover:opacity-0",
          )}
        >
          {frontContent}
        </Card>

        <Card
          className={cn(
            baseCardClassName,
            "absolute inset-0 gap-0 overflow-hidden py-0 opacity-0 transition-opacity duration-300 ease-out motion-reduce:opacity-0 motion-reduce:transition-none group-hover:opacity-100",
          )}
        >
          <CardContent className="h-full p-0">
            {backContent}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
