// Insert (#448): the board's one way to add a tool, a hands-on piece or a game. It is the library laid over the board:
// the menu groups of src/menus.ts down the side (still the one source, so a new piece is one MENUS entry), the chosen
// group's sections beside them, and a search across all of them. Picking one closes the panel and puts it on the board.
// "By grade" swaps the groups for the grades (menuGrades.ts): a grade's tools, pieces and games from every menu at once.
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { fold, menuName } from "../library";
import { fill } from "../math/text";
import { gradeSections } from "../menuGrades";
import { GRADES, type Grade } from "../model/curriculum";
import { TOPICS, type TopicId } from "../model/topics";
import { isLiveEntry, MENUS, type LiveEntry, type MenuEntry, type MenuGroup } from "../menus";
import { BarIcon } from "./BarIcon";
import { gradeName, rung } from "./GradeCard";

type Item = MenuEntry | LiveEntry;
type Mode = "topic" | "grade";
const KEY = "zeno.insert.group";
const MODE_KEY = "zeno.insert.mode";
const GRADE_KEY = "zeno.insert.grade";

const load = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // not remembered: the default
  }
};
const save = (key: string, v: string) => {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* the panel still switches */
  }
};
const savedGroup = () => {
  const g = load(KEY);
  return g && MENUS.some((m) => m.label === g) ? g : MENUS[0].label;
};
const savedGrade = (): Grade => {
  const g = Number(load(GRADE_KEY));
  return GRADES.includes(g as Grade) ? (g as Grade) : GRADES[0];
};
/** "grade 6" as a heading: "Grade 6" (Georgian has no capitals, so it is left as it is). */
const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
const topicOfSection = (title?: string) => (title ? TOPICS.find((x) => x.sections.includes(title as never))?.id : undefined);

export function InsertPanel({ onPick, onClose }: { onPick: (item: Item) => void; onClose: () => void }) {
  const { t } = useI18n();
  const w = t.site.insert;
  const [group, setGroupState] = useState(savedGroup);
  const [mode, setModeState] = useState<Mode>(() => (load(MODE_KEY) === "grade" ? "grade" : "topic"));
  const [grade, setGradeState] = useState(savedGrade);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const setGroup = (g: string) => (setGroupState(g), save(KEY, g));
  const setMode = (m: Mode) => (setModeState(m), save(MODE_KEY, m));
  const setGrade = (g: Grade) => (setGradeState(g), save(GRADE_KEY, String(g)));
  const gw = t.pracWords.grades;

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
    found ??
    (mode === "grade"
      ? gradeSections(grade).map((s) => ({ key: s.key, head: t[s.section.title ?? s.group.title ?? s.group.label], items: s.items, topic: topicOfSection(s.section.title) }))
      : current.sections.map((sec, n) => ({ key: `${n}`, head: sec.title && t[sec.title], items: sec.items, topic: topicOfSection(sec.title) })));

  // The side's tabs: the menus' groups, or the grades.
  const tabs =
    mode === "grade"
      ? GRADES.map((g) => ({ id: String(g), on: g === grade, mark: <span className="insert-rung">{rung(g, gw)}</span>, name: cap(gradeName(g, gw)), title: cap(gradeName(g, gw)), pick: () => setGrade(g) }))
      : MENUS.map((g) => ({ id: g.label, on: g.label === current.label, mark: <BarIcon name={g.icon} />, name: t[g.label], title: groupName(g), pick: () => setGroup(g.label) }));
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length];
    next.pick();
    box.current?.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
  };
  const here = tabs.find((x) => x.on) ?? tabs[0];

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
            <div className="insert-side">
              <div className="insert-mode" role="group" aria-label={w.title}>
                {(["topic", "grade"] as const).map((m) => (
                  <button key={m} className={mode === m ? "on" : ""} aria-pressed={mode === m} onClick={() => setMode(m)}>
                    {m === "topic" ? w.byTopic : w.byGrade}
                  </button>
                ))}
              </div>
              <div className="insert-groups" role="tablist" aria-label={mode === "grade" ? w.byGrade : w.byTopic} aria-orientation="vertical">
                {tabs.map((x, i) => (
                  <button
                    key={x.id}
                    role="tab"
                    data-tab={x.id}
                    id={`insert-tab-${x.id}`}
                    aria-selected={x.on}
                    aria-controls="insert-items"
                    tabIndex={x.on ? 0 : -1}
                    className={`insert-group${x.on ? " on" : ""}`}
                    title={x.title}
                    onClick={x.pick}
                    onKeyDown={(e) => onTabKey(e, i)}
                  >
                    {x.mark}
                    <span>{x.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div
            id="insert-items"
            className="insert-items"
            {...(found ? { role: "region", "aria-label": t.site.search } : { role: "tabpanel", "aria-labelledby": `insert-tab-${here.id}` })}
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
