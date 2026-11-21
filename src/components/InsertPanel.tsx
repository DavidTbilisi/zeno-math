// Insert (#448): the board's one way to add a tool, a hands-on piece or a game. It is the library laid over the board:
// the menu groups of src/menus.ts down the side (still the one source, so a new piece is one MENUS entry), the chosen
// group's sections beside them, and a search across all of them. Picking one closes the panel and puts it on the board.
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { fold, menuName } from "../library";
import { fill } from "../math/text";
import { TOPICS, type TopicId } from "../model/topics";
import { isLiveEntry, MENUS, type LiveEntry, type MenuEntry, type MenuGroup } from "../menus";
import { BarIcon } from "./BarIcon";

type Item = MenuEntry | LiveEntry;
const KEY = "zeno.insert.group";

function savedGroup(): string {
  try {
    const g = localStorage.getItem(KEY);
    if (g && MENUS.some((m) => m.label === g)) return g;
  } catch {
    /* not remembered: the first group */
  }
  return MENUS[0].label;
}

export function InsertPanel({ onPick, onClose }: { onPick: (item: Item) => void; onClose: () => void }) {
  const { t } = useI18n();
  const w = t.site.insert;
  const [group, setGroupState] = useState(savedGroup);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const setGroup = (g: string) => {
    setGroupState(g);
    try {
      localStorage.setItem(KEY, g);
    } catch {
      /* the panel still switches */
    }
  };

  // Escape closes it, before Excalidraw sees the key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const groupName = (g: MenuGroup) => t[g.title ?? g.label];
  const words = fold(q).split(/\s+/).filter(Boolean);
  // A search looks through every group; its results keep their group and section as the heading.
  const found = words.length
    ? MENUS.flatMap((g) =>
        g.sections.map((sec) => ({
          key: `${g.label}/${sec.title ?? ""}`,
          head: sec.title ? `${groupName(g)} · ${t[sec.title]}` : groupName(g),
          items: sec.items.filter((it) => {
            const hay = fold(`${menuName(t, it)} ${sec.title ? t[sec.title] : ""} ${groupName(g)}`);
            return words.every((x) => hay.includes(x));
          }),
        })),
      ).filter((s) => s.items.length)
    : null;
  const current = MENUS.find((m) => m.label === group) ?? MENUS[0];
  const sections: { key: string; head?: string; items: Item[]; topic?: TopicId }[] =
    found ?? current.sections.map((sec, n) => ({ key: `${n}`, head: sec.title && t[sec.title], items: sec.items, topic: sec.title && TOPICS.find((x) => x.sections.includes(sec.title!))?.id }));

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = MENUS[(i + step + MENUS.length) % MENUS.length];
    setGroup(next.label);
    box.current?.querySelector<HTMLButtonElement>(`[data-group="${next.label}"]`)?.focus();
  };

  return (
    <div className="insert-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} className="insert" role="dialog" aria-modal="true" aria-label={w.title}>
        <div className="insert-head">
          <h2>{w.title}</h2>
          <input
            className="insert-search"
            type="search"
            value={q}
            autoFocus
            placeholder={t.site.search}
            aria-label={t.site.search}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn ghost insert-close" onClick={onClose} aria-label={t.close} title={t.close}>✕</button>
        </div>
        <div className={`insert-body${found ? " searching" : ""}`}>
          {!found && (
            <div className="insert-groups" role="tablist" aria-label={w.title} aria-orientation="vertical">
              {MENUS.map((g, i) => (
                <button
                  key={g.label}
                  role="tab"
                  data-group={g.label}
                  id={`insert-tab-${g.label}`}
                  aria-selected={g.label === current.label}
                  aria-controls="insert-items"
                  tabIndex={g.label === current.label ? 0 : -1}
                  className={`insert-group${g.label === current.label ? " on" : ""}`}
                  title={groupName(g)}
                  onClick={() => setGroup(g.label)}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  <BarIcon name={g.icon} />
                  <span>{t[g.label]}</span>
                </button>
              ))}
            </div>
          )}
          <div
            id="insert-items"
            className="insert-items"
            {...(found ? { role: "region", "aria-label": t.site.search } : { role: "tabpanel", "aria-labelledby": `insert-tab-${current.label}` })}
          >
            {sections.length ? (
              sections.map((sec) => (
                <section key={sec.key} className="insert-section" aria-label={sec.head || undefined}>
                  {sec.head && (
                    <div className="insert-section-head">
                      <h3>{sec.head}</h3>
                      {/* The lesson side of it lives on the topic's page now (#448). */}
                      {sec.topic && <a href={`#/learn/${sec.topic}`}>{fill(w.topic, { topic: t.site.topics[sec.topic].name })} →</a>}
                    </div>
                  )}
                  <div className="insert-grid">
                    {sec.items.map((it) => (
                      <button key={isLiveEntry(it) ? it.live : `${it.kind}/${it.start ?? ""}`} className="insert-item" onClick={() => onPick(it)}>
                        <span className="insert-icon">{it.icon}</span>
                        {menuName(t, it)}
                      </button>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <p className="course-count" role="status">{fill(t.site.searchNone, { q: q.trim() })}</p>
            )}
          </div>
        </div>
        <p className="insert-foot">
          <span>{w.hint}</span>
          <a href="#/library">{w.library} →</a>
        </p>
      </div>
    </div>
  );
}
