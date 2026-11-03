// The idea map after a session (issue #285): a skill's ideas as tiles in rows, the ideas each rests on above it and
// joined to it by a line (dashed where two ideas are used together), each tile lit once the student has shown that idea
// and marked "new" when it lit in this session. Tiles never go dark (ideaMap.ts). The lines are drawn where the tiles
// land, so the rows can wrap on a phone; a newly lit tile pops in arcade and only changes colour in calm (styles.css).
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";
import { ideaMap } from "../model/ideaMap";
import type { IdeaSkill } from "../model/ideaState";

type Line = { x1: number; y1: number; x2: number; y2: number; joins: boolean; lit: boolean };

export function IdeaMap({ skill, lit, fresh, w }: { skill: IdeaSkill; lit: readonly string[]; fresh: readonly string[]; w: Dict["pracWords"] }) {
  const { rows, edges } = useMemo(() => ideaMap(skill), [skill]);
  const box = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const all = rows.flat();
  const shown = all.filter((id) => lit.includes(id)).length;

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const draw = () => {
      const at = el.getBoundingClientRect();
      const tile = (id: string) => el.querySelector<HTMLElement>(`[data-idea="${id}"]`)?.getBoundingClientRect();
      setSize({ w: at.width, h: at.height });
      setLines(edges.flatMap(([a, b, kind]) => {
        const [from, to] = [tile(a), tile(b)];
        if (!from || !to) return [];
        return [{
          x1: from.left + from.width / 2 - at.left, y1: from.bottom - at.top,
          x2: to.left + to.width / 2 - at.left, y2: to.top - at.top,
          joins: kind === "joins", lit: lit.includes(a) && lit.includes(b),
        }];
      }));
    };
    draw();
    const watch = new ResizeObserver(draw);
    watch.observe(el);
    return () => watch.disconnect();
  }, [edges, lit]);

  return (
    <section className="idea-map" aria-label={fill(w.ui.ideaMapTitle, { skill: w.skills[skill] })}>
      <h3>{fill(w.ui.ideaMapTitle, { skill: w.skills[skill] })}</h3>
      <p className="hint">
        {fill(w.ui.ideaMapCount, { n: shown, total: all.length })}
        {fresh.length > 0 && ` · ${fill(w.ui.ideaMapFresh, { n: fresh.length })}`}
      </p>
      <div className="idea-map-board" ref={box}>
        <svg className="idea-map-lines" width={size.w} height={size.h} aria-hidden="true">
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className={`${l.joins ? "joins" : ""}${l.lit ? " lit" : ""}`} />
          ))}
        </svg>
        <ul className="idea-map-rows">
          {rows.map((row, r) => (
            <li key={r}>
              <ul className="idea-map-row">
                {row.map((id) => {
                  const on = lit.includes(id), isNew = fresh.includes(id);
                  return (
                    <li key={id} data-idea={id} className={`idea-tile${on ? " lit" : ""}${isNew ? " fresh" : ""}`}>
                      <span>{w.ideas[id]}</span>
                      <small>{isNew ? `✨ ${w.ui.ideaNew}` : on ? `✓ ${w.ui.ideaShown}` : w.ui.ideaNotYet}</small>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
      <p className="hint">{w.ui.ideaMapHint}</p>
    </section>
  );
}
