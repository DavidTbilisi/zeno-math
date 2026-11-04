// The idea map after a session (issue #285): a skill's ideas as tiles in rows, the ideas each rests on above it and
// joined to it by a line (dashed where two ideas are used together), each tile lit once the student has shown that idea
// and marked "new" when it lit in this session. Tiles never go dark (ideaMap.ts). A newly lit tile pops in arcade and
// only changes colour in calm (styles.css).
//
// Tiles shrink before a row wraps, so a laptop shows the whole graph. On a phone the wider rows still wrap, and lines
// between wrapped rows cross the tiles, so there the map shows each row as a band and draws only the lines of the idea
// the student picks. Picking an idea also says in words what it rests on, on every screen.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";
import type { IdeaNode } from "../model/conceptGraph";
import { ideaMap } from "../model/ideaMap";
import type { IdeaSkill } from "../model/ideaState";

type Line = { x1: number; y1: number; x2: number; y2: number; joins: boolean; lit: boolean; picked: boolean };

export function IdeaMap({ skill, lit, fresh, w }: { skill: IdeaSkill; lit: readonly string[]; fresh: readonly string[]; w: Dict["pracWords"] }) {
  const { rows, edges } = useMemo(() => ideaMap(skill), [skill]);
  const box = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [wrapped, setWrapped] = useState(false);
  const [picked, setPicked] = useState<IdeaNode | null>(null);
  const all = rows.flat();
  const shown = all.filter((id) => lit.includes(id)).length;
  const under = picked ? edges.filter(([, b]) => b === picked).map(([a]) => a) : [];
  const over = picked ? edges.filter(([a]) => a === picked).map(([, b]) => b) : [];

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const draw = () => {
      const at = el.getBoundingClientRect();
      const tile = (id: string) => el.querySelector<HTMLElement>(`[data-idea="${id}"]`)?.getBoundingClientRect();
      // A row has wrapped when its tiles do not all sit at the same height (offsetTop, so a popping tile's scale is ignored).
      const wraps = [...el.querySelectorAll(".idea-map-row")].some((row) => {
        const tops = [...row.children].map((t) => (t as HTMLElement).offsetTop);
        return tops.some((t) => Math.abs(t - tops[0]) > 2);
      });
      setWrapped(wraps);
      setSize({ w: at.width, h: at.height });
      setLines(edges.flatMap(([a, b, kind]) => {
        const touches = a === picked || b === picked;
        const [from, to] = [tile(a), tile(b)];
        if (!from || !to || (wraps && !touches)) return [];
        return [{
          x1: from.left + from.width / 2 - at.left, y1: from.bottom - at.top,
          x2: to.left + to.width / 2 - at.left, y2: to.top - at.top,
          joins: kind === "joins", lit: lit.includes(a) && lit.includes(b), picked: touches,
        }];
      }));
    };
    draw();
    const watch = new ResizeObserver(draw);
    watch.observe(el);
    // A popping tile is scaled while it pops: draw its lines again once it has settled.
    el.addEventListener("animationend", draw);
    return () => {
      watch.disconnect();
      el.removeEventListener("animationend", draw);
    };
  }, [edges, lit, picked]);

  const say = picked === null ? w.ui.ideaMapPick
    : under.length ? fill(w.ui.ideaRestsOn, { idea: w.ideas[picked] })
    : fill(w.ui.ideaRestsOnNothing, { idea: w.ideas[picked] });

  return (
    <section className="idea-map" aria-label={fill(w.ui.ideaMapTitle, { skill: w.skills[skill] })}>
      <h3>{fill(w.ui.ideaMapTitle, { skill: w.skills[skill] })}</h3>
      <p className="hint">
        {fill(w.ui.ideaMapCount, { n: shown, total: all.length })}
        {fresh.length > 0 && ` · ${fill(w.ui.ideaMapFresh, { n: fresh.length })}`}
      </p>
      <div className={`idea-map-board${wrapped ? " wrapped" : ""}${picked ? " has-pick" : ""}`} ref={box}>
        <svg className="idea-map-lines" width={size.w} height={size.h} aria-hidden="true">
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className={[l.joins && "joins", l.lit && "lit", l.picked && "picked"].filter(Boolean).join(" ")} />
          ))}
        </svg>
        <ul className="idea-map-rows">
          {rows.map((row, r) => (
            <li key={r}>
              <ul className="idea-map-row">
                {row.map((id) => {
                  const on = lit.includes(id), isNew = fresh.includes(id);
                  const kin = id === picked ? " picked" : under.includes(id) ? " under" : over.includes(id) ? " over" : "";
                  return (
                    <li key={id} data-idea={id} className={`idea-tile${on ? " lit" : ""}${isNew ? " fresh" : ""}${kin}`}>
                      <button type="button" aria-pressed={id === picked} onClick={() => setPicked(id === picked ? null : id)}>
                        <span>{w.ideas[id]}</span>
                        <small>{isNew ? `✨ ${w.ui.ideaNew}` : on ? `✓ ${w.ui.ideaShown}` : w.ui.ideaNotYet}</small>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
      <div className="idea-map-say" aria-live="polite">
        {say}
        {under.length > 0 && <ul>{under.map((id) => <li key={id}>{w.ideas[id]}</li>)}</ul>}
      </div>
      <p className="hint">{w.ui.ideaMapHint}</p>
    </section>
  );
}
