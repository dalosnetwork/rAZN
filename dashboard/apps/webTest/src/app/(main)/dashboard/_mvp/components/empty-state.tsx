"use client";

import type { ReactNode } from "react";

import { InboxIcon } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type MvpEmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
};

export function MvpEmptyState({
  title,
  description,
  icon,
}: MvpEmptyStateProps) {
  const { tt } = useI18n();

  return (
    <Empty className="border rounded-lg">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {icon ?? <InboxIcon className="size-5" />}
        </EmptyMedia>
        <EmptyTitle>{tt(title)}</EmptyTitle>
        <EmptyDescription>{tt(description)}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
