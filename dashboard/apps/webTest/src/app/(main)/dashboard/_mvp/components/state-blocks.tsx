"use client";

import { AlertCircleIcon, LoaderCircleIcon } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function MvpLoadingBlock() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function MvpInlineLoading({ label }: { label?: string }) {
  const { tt } = useI18n();

  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground text-sm">
      <LoaderCircleIcon className="size-4 animate-spin" />
      {tt(label ?? "Loading...")}
    </span>
  );
}

export function MvpErrorAlert({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { tt } = useI18n();

  return (
    <Alert variant="destructive">
      <AlertCircleIcon className="size-4" />
      <AlertTitle>{tt(title)}</AlertTitle>
      <AlertDescription>{tt(description)}</AlertDescription>
    </Alert>
  );
}
