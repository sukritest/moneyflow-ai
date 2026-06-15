import en from "./dictionaries/en.json";
import th from "./dictionaries/th.json";

export type Dictionary = typeof en;

const dictionaries: Record<string, Dictionary> = { en, th };

/** Server-side helper for fetching the translation dictionary for a user's locale. */
export function getDictionary(locale: string): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

/** Dotted-path lookup, e.g. translate(dict, "nav.dashboard"). */
export function translate(dict: Dictionary, key: string): string {
  const value = key
    .split(".")
    .reduce<unknown>((acc, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined), dict);
  return typeof value === "string" ? value : key;
}
