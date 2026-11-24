// Zeno's languages: a module of its own so the front page published on its own (landing.tsx) can offer them without
// the dictionaries i18n.tsx loads.
export type Lang = "en" | "ru" | "ka";

export const LANGS: { code: Lang; label: string; excalidraw: string }[] = [
  { code: "en", label: "English", excalidraw: "en" },
  { code: "ru", label: "Русский", excalidraw: "ru-RU" },
  // Excalidraw has no Georgian locale yet; its toolbar falls back to English.
  { code: "ka", label: "ქართული", excalidraw: "en" },
];

const isLang = (s: string | null | undefined): s is Lang => s === "en" || s === "ru" || s === "ka";

/**
 * The page's own language when it has one: a page written in one language (a topic's page published on its own says
 * so with data-lang on <html>), else ?lang= in the address, which is how the published front page and practice have
 * an address in each language for a search engine to list.
 */
export function pageLang(): Lang | null {
  if (typeof document === "undefined") return null;
  const fixed = document.documentElement.dataset.lang;
  if (isLang(fixed)) return fixed;
  const asked = new URLSearchParams(location.search).get("lang");
  return isLang(asked) ? asked : null;
}

/** Once the reader has chosen a language themselves, ?lang= no longer speaks for them. */
export function dropAddressLang() {
  const u = new URL(location.href);
  if (!u.searchParams.has("lang")) return;
  u.searchParams.delete("lang");
  history.replaceState(history.state, "", u);
}

/** The page's own language, else the one kept from last time, else the browser's, else English. */
export function detectLang(): Lang {
  const own = pageLang();
  if (own) return own;
  try {
    const saved = localStorage.getItem("lang");
    if (isLang(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  const nav = navigator.language.slice(0, 2);
  return nav === "ru" || nav === "ka" ? nav : "en";
}
