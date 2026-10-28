// The bar along the top of the branded pages: Zeno's mark and name (home), then the page's own links and the language.
import type { ReactNode } from "react";
import { LangSelect, useI18n } from "../i18n";
import { ZenoMark } from "./ZenoMark";

export function BrandBar({ home = "#/", children }: { home?: string; children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="z-bar">
      <a className="z-brand" href={home}><ZenoMark size={18} /><span>{t.appName}</span></a>
      <nav className="z-nav">
        {children}
        <LangSelect />
      </nav>
    </header>
  );
}
