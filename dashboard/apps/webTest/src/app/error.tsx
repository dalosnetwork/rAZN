"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

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
    title: "Something went wrong",
    description: "We hit an unexpected error while loading this page. Please try again.",
    tryAgain: "Try again",
    goToDashboard: "Go to dashboard",
  },
  tr: {
    title: "Bir şeyler yanlış gitti",
    description: "Bu sayfa yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
    tryAgain: "Tekrar dene",
    goToDashboard: "Panele git",
  },
  ru: {
    title: "Что-то пошло не так",
    description: "Во время загрузки страницы произошла непредвиденная ошибка. Повторите попытку.",
    tryAgain: "Повторить",
    goToDashboard: "Перейти в панель",
  },
  az: {
    title: "Nəsə xəta baş verdi",
    description: "Səhifə yüklənərkən gözlənilməz xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.",
    tryAgain: "Yenidən cəhd et",
    goToDashboard: "Panelə keç",
  },
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<RuntimeLocale>("en");

  useEffect(() => {
    console.error("[app-error-boundary]", error);
  }, [error]);

  useEffect(() => {
    setLocale(detectRuntimeLocale(window.navigator.language));
  }, []);

  const copy = COPY[locale];

  return (
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
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          {copy.goToDashboard}
        </Link>
      </div>
    </div>
  );
}
