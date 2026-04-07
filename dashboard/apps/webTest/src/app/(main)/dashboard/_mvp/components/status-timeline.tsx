"use client";

import { CircleIcon } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import type { TimelineEntry } from "../types";
import { formatDateTime } from "./formatters";
import { StatusBadge } from "./status-badge";

type StatusTimelineProps = {
  entries: TimelineEntry[];
};

export function StatusTimeline({ entries }: StatusTimelineProps) {
  const { tt, tx } = useI18n();

  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={`${entry.label}-${entry.timestamp}`} className="flex gap-3">
          <span className="mt-1 text-muted-foreground">
            <CircleIcon className="size-3 fill-current" />
          </span>
          <div className="flex-1 space-y-1 rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-sm">{tt(entry.label)}</p>
              <StatusBadge status={entry.status} />
            </div>
            <p className="text-muted-foreground text-xs">
              {formatDateTime(entry.timestamp)}
            </p>
            {entry.actor ? (
              <p className="text-xs">
                {tx("By", "Tarafından", "Кем")}: {tt(entry.actor)}
              </p>
            ) : null}
            {entry.note ? (
              <p className="text-muted-foreground text-xs">{tt(entry.note)}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
