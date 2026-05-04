"use client";

export type RuntimeLocale = "en" | "tr" | "ru" | "az";

export function detectRuntimeLocale(input: string | undefined): RuntimeLocale {
  const normalized = (input ?? "").toLowerCase();
  if (normalized.startsWith("tr")) return "tr";
  if (normalized.startsWith("ru")) return "ru";
  if (normalized.startsWith("az")) return "az";
  return "en";
}
