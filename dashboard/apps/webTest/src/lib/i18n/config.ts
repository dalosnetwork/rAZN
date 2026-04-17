export const LANGUAGE_VALUES = ["en", "tr", "ru", "az"] as const;

export type Language = (typeof LANGUAGE_VALUES)[number];

export const DEFAULT_LANGUAGE: Language = "az";

export const LANGUAGE_STORAGE_KEY = "dashboard_language";

export function isLanguage(value: string): value is Language {
  return LANGUAGE_VALUES.includes(value as Language);
}
