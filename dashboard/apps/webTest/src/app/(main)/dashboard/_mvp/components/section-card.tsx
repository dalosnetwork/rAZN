"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/components/providers/language-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MvpSectionCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
};

export function MvpSectionCard({
  title,
  description,
  action,
  children,
  contentClassName,
}: MvpSectionCardProps) {
  const { tt } = useI18n();

  return (
    <Card className="gap-0">
      <CardHeader className="border-b pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base">{tt(title)}</CardTitle>
          {description ? (
            <CardDescription>{tt(description)}</CardDescription>
          ) : null}
        </div>
        {action ? <div className="justify-self-end">{action}</div> : null}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
