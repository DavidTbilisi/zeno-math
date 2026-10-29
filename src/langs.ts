// Zeno's languages: a module of its own so the front page published on its own (landing.tsx) can offer them without
// the dictionaries i18n.tsx loads.
export type Lang = "en" | "ru" | "ka";

export const LANGS: { code: Lang; label: string; excalidraw: string }[] = [
  { code: "en", label: "English", excalidraw: "en" },
  { code: "ru", label: "Русский", excalidraw: "ru-RU" },
  // Excalidraw has no Georgian locale yet; its toolbar falls back to English.
  { code: "ka", label: "ქართული", excalidraw: "en" },
];

/** The language kept from last time, else the browser's, else English. */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "ru" || saved === "ka") return saved;
  } catch {
    /* storage unavailable */
  }
  const nav = navigator.language.slice(0, 2);
  return nav === "ru" || nav === "ka" ? nav : "en";
}
