"use client";

import { useI18n } from "@/components/providers/language-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { MVP_STATUS_META, type MvpStatus } from "../types";

type StatusBadgeProps = {
  status: MvpStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { tt } = useI18n();
  const meta = MVP_STATUS_META[status];

  return (
    <Badge
      variant={meta.variant}
      className={cn("capitalize", meta.className, className)}
    >
      {tt(meta.label)}
    </Badge>
  );
}
