"use client";

import Link from "next/link";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const { tt } = useI18n();

  return (
    <div className="flex h-dvh flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">{tt("Page not found.")}</h1>
      <p className="text-muted-foreground">
        {tt("The page you are looking for could not be found.")}
      </p>
      <Link prefetch={false} replace href="/dashboard/overview">
        <Button variant="outline">{tt("Go back home")}</Button>
      </Link>
    </div>
  );
}
