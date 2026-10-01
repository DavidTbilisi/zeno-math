import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { Dict } from "../locales/en";
import { MENUS, TOOLS, type ToolKind } from "../tools";

type Entry = {
  kind: ToolKind;
  start?: string;
  icon: string;
  title: string;
  sub: string;
  /** Algorithm names and the like that live inside a tab. */
  names: string[];
  hint: string;
  /** A tab inside a tool, not a menu entry. */
  topic: boolean;
};

/** Case- and accent-insensitive: "Dijkstra" finds "dijkstra", "е" finds "ё". */
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/ё/g, "е");

function entries(t: Dict): Entry[] {
  const out: Entry[] = [];
  const seen = new Set<ToolKind>();
  for (const menu of MENUS)
    for (const it of menu.items) {
      out.push({ kind: it.kind, start: it.start, icon: it.icon, title: t[it.label], sub: t[menu.title ?? menu.label], names: [], hint: "", topic: false });
      if (seen.has(it.kind) || it.start) continue;
      seen.add(it.kind);
      const tool = TOOLS[it.kind];
      const topics = tool.topics?.(t) ?? {};
      const hints = tool.hints?.(t) ?? {};
      const names = tool.names?.(t) ?? {};
      for (const [key, label] of Object.entries(topics))
        out.push({ kind: it.kind, start: key, icon: it.icon, title: t[it.label], sub: label, names: Object.values(names[key] ?? {}), hint: hints[key] ?? "", topic: true });
    }
  return out;
}

/** Every word must match somewhere; titles count most, then names inside a tab, then the hints. */
function search(all: Entry[], query: string): { e: Entry; via?: string }[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return all.filter((e) => !e.topic).map((e) => ({ e }));
  const scored: { e: Entry; via?: string; score: number; i: number }[] = [];
  all.forEach((e, i) => {
    let score = 0;
    let via: string | undefined;
    for (const w of words) {
      const head = [norm(e.sub), norm(e.title)];
      if (head.some((h) => h.startsWith(w) || h.split(/[\s(–-]+/).some((p) => p.startsWith(w)))) continue;
      if (head.some((h) => h.includes(w))) {
        score += 1;
        continue;
      }
      const name = e.names.find((n) => norm(n).includes(w));
      if (name) {
        score += 2;
        via = name;
        continue;
      }
      if (norm(e.hint).includes(w)) {
        score += 5;
        continue;
      }
      return;
    }
    scored.push({ e, via, score, i });
  });
  return scored.sort((a, b) => a.score - b.score || a.i - b.i).slice(0, 12);
}

/** Ctrl+K or "/": find any tool or tab by name, in the current language, and open it. */
export function CommandPalette({ onPick, onClose }: { onPick: (kind: ToolKind, start?: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const all = useMemo(() => entries(t), [t]);
  const results = useMemo(() => search(all, query), [all, query]);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (i: number) => {
    const r = results[i];
    if (r) onPick(r.e.kind, r.e.start);
  };

  return (
    <div className="palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={t.searchTools}>
        <input
          autoFocus
          className="palette-input"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={results.length ? `palette-${active}` : undefined}
          placeholder={t.searchTools}
          value={query}
          spellCheck={false}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const n = results.length || 1;
              setActive((a) => (a + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(active);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
        />
        <ul className="palette-list" id="palette-list" role="listbox" ref={list}>
          {results.map(({ e, via }, i) => (
            <li
              key={`${e.kind}-${e.start ?? ""}-${i}`}
              id={`palette-${i}`}
              data-i={i}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : ""}
              onMouseMove={() => setActive(i)}
              onMouseDown={(ev) => {
                ev.preventDefault();
                pick(i);
              }}
            >
              <span className="tool-menu-icon">{e.icon}</span>
              <span className="palette-title">{e.title}</span>
              <span className="palette-sub">{e.sub}</span>
              {via && <span className="palette-via">{via}</span>}
            </li>
          ))}
        </ul>
        {!results.length && <p className="muted small palette-none">{t.searchNone}</p>}
      </div>
    </div>
  );
}
