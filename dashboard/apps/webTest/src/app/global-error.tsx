"use client";

import { useEffect, useState } from "react";

import { detectRuntimeLocale, type RuntimeLocale } from "@/lib/i18n/runtime-locale";

const COPY: Record<
  RuntimeLocale,
  {
    title: string;
    description: string;
    tryAgain: string;
    goToDashboard: string;
  }
> = {
  en: {
    title: "Application error",
    description: "An unexpected error occurred while loading the app.",
    tryAgain: "Try again",
    goToDashboard: "Go to dashboard",
  },
  tr: {
    title: "Uygulama hatası",
    description: "Uygulama yüklenirken beklenmeyen bir hata oluştu.",
    tryAgain: "Tekrar dene",
    goToDashboard: "Panele git",
  },
  ru: {
    title: "Ошибка приложения",
    description: "Во время загрузки приложения произошла непредвиденная ошибка.",
    tryAgain: "Повторить",
    goToDashboard: "Перейти в панель",
  },
  az: {
    title: "Tətbiq xətası",
    description: "Tətbiq yüklənərkən gözlənilməz xəta baş verdi.",
    tryAgain: "Yenidən cəhd et",
    goToDashboard: "Panelə keç",
  },
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<RuntimeLocale>("en");

  useEffect(() => {
    console.error("[global-error-boundary]", error);
  }, [error]);

  useEffect(() => {
    setLocale(detectRuntimeLocale(window.navigator.language));
  }, []);

  const copy = COPY[locale];

  return (
    <html lang={locale}>
      <body>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-balance font-semibold text-2xl">{copy.title}</h1>
          <p className="max-w-xl text-balance text-muted-foreground">
            {copy.description}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-primary-foreground text-sm hover:bg-primary/90"
            >
              {copy.tryAgain}
            </button>
            <a
              href="/dashboard"
              className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              {copy.goToDashboard}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
