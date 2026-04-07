"use client";

import { useState } from "react";

import type { Language } from "@/lib/i18n/config";
import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const LANGUAGE_OPTIONS: ReadonlyArray<{
  value: Language;
  key: "language.english" | "language.turkish" | "language.russian" | "language.azerbaijani";
  countryCode: "gb" | "tr" | "ru" | "az";
}> = [
  { value: "en", key: "language.english", countryCode: "gb" },
  { value: "tr", key: "language.turkish", countryCode: "tr" },
  { value: "ru", key: "language.russian", countryCode: "ru" },
  { value: "az", key: "language.azerbaijani", countryCode: "az" },
];

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const selectedLanguage = LANGUAGE_OPTIONS.find((option) => option.value === language) ?? LANGUAGE_OPTIONS[0];

  function handleSelect(value: Language) {
    setLanguage(value);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" aria-label={t("common.language")}>
          <img
            src={`https://flagcdn.com/w40/${selectedLanguage.countryCode}.png`}
            alt={`${t(selectedLanguage.key)} flag`}
            className="h-3 w-4 rounded-[2px] object-cover"
            loading="lazy"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="flex flex-col gap-1">
          <h4 className="font-medium text-sm leading-none px-1 pb-1">{t("common.language")}</h4>
          <div className="grid gap-0.5">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                aria-selected={option.value === language}
              >
                <img
                  src={`https://flagcdn.com/w40/${option.countryCode}.png`}
                  alt={`${t(option.key)} flag`}
                  className="h-3 w-4 rounded-[2px] object-cover"
                  loading="lazy"
                />
                <span>{t(option.key)}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
