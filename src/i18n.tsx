import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Dict } from "./locales/en";

export type Lang = "en" | "ru" | "ka";

export const LANGS: { code: Lang; label: string; excalidraw: string }[] = [
  { code: "en", label: "English", excalidraw: "en" },
  { code: "ru", label: "Русский", excalidraw: "ru-RU" },
  // Excalidraw has no Georgian locale yet; its toolbar falls back to English.
  { code: "ka", label: "ქართული", excalidraw: "en" },
];

// Each language is its own chunk; only the one in use is downloaded.
const LOADERS: Record<Lang, () => Promise<Dict>> = {
  en: () => import("./locales/en").then((m) => m.en),
  ru: () => import("./locales/ru").then((m) => m.ru),
  ka: () => import("./locales/ka").then((m) => m.ka),
};
const loaded: Partial<Record<Lang, Dict>> = {};
const load = async (l: Lang) => (loaded[l] ??= await LOADERS[l]());

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "ru" || saved === "ka") return saved;
  } catch {
    /* storage unavailable */
  }
  const nav = navigator.language.slice(0, 2);
  return nav === "ru" || nav === "ka" ? nav : "en";
}

type I18n = { lang: Lang; setLang: (l: Lang) => void; t: Dict; excalidrawLang: string };

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);
  // The strings on screen; while another language loads, the previous one stays up.
  const [shown, setShown] = useState<{ lang: Lang; t: Dict } | null>(null);
  useEffect(() => {
    let live = true;
    load(lang).then((t) => live && setShown({ lang, t }));
    document.documentElement.lang = lang;
    return () => {
      live = false;
    };
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {
      /* storage unavailable */
    }
  };
  if (!shown) return null;
  const excalidrawLang = LANGS.find((l) => l.code === shown.lang)!.excalidraw;
  return <I18nContext.Provider value={{ lang: shown.lang, setLang, t: shown.t, excalidrawLang }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}

export function LangSelect() {
  const { lang, setLang, t } = useI18n();
  return (
    <select className="lang-select" aria-label={t.language} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
