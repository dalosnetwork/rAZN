"use client";

import { useI18n } from "@/components/providers/language-provider";

export default function DashboardNotFound() {
  const { tx } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">{tx("Page not found.", "Sayfa bulunamadı.")}</h1>
      <p className="text-muted-foreground">
        {tx("This section will be added in future updates.", "Bu bölüm gelecekteki güncellemelerde eklenecek.")}
      </p>
    </div>
  );
}
