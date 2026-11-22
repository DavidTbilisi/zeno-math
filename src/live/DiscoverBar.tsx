// The discover games' hands, drawn under their picture: the moves as pills (measure, this one, the claim, Why?), the
// answers to choose from as cards dragged up into the picture (or tapped), and the rule to make as slots with their
// chips beneath: a chip dragged into its slot (or tapped) fills it, a filled slot tapped empties it. It is its own small
// svg inside the picture, so its drags are followed here and not by the picture's own corner.
import { BLUE, inBox, keyTap, MUTED, Pill, RED, useDrag } from "./hand";
import { INK } from "./ui";

export type BarGroup = {
  label: string;
  options: readonly string[];
  on: string | null;
  text: (o: string) => string;
  color?: (o: string) => string;
  off?: (o: string) => boolean;
  pick: (o: string | null) => void;
  /** A sign drawn before the group's slot, like the = before a rule's answer. */
  before?: string;
};
export type BarPill = { text: string; onTap: () => void; strong?: boolean; on?: boolean; disabled?: boolean };

const [ROW, SLOT_H, CHIP_H, GAP, SIGN] = [44, 36, 32, 18, 22];
const chipW = (s: string) => Math.max(36, 18 + [...s].length * 9);
const pillW = (s: string) => 30 + [...s].length * 8.4;

type Grab = { g: number; o: string } | { card: number };

/** How tall the bar is drawn for these groups in width `w`. */
export function barHeight(w: number, groups: BarGroup[] | null) {
  return ROW + (groups ? lay(w, groups).lines * (SLOT_H + CHIP_H + 20) : 0);
}

/** Where each group goes: across, then onto a new line when the width runs out. */
function lay(w: number, groups: BarGroup[]) {
  let [x, line] = [16, 0];
  const at = groups.map((gr) => {
    const chips = gr.options.reduce((s, o) => s + chipW(gr.text(o)) + 4, -4);
    const gw = Math.max(72, chips);
    const lead = gr.before ? SIGN : 0;
    if (x + lead + gw > w - 12 && x > 16) [x, line] = [16, line + 1];
    const box = { x: x + lead, line, w: gw };
    x += lead + gw + GAP;
    return box;
  });
  return { at, lines: line + 1 };
}

export function DiscoverBar({ y, w, pills, cards, groups, why }: {
  y: number;
  w: number;
  pills: BarPill[];
  /** The answers to choose from: dragged into the picture above the bar, or tapped. */
  cards?: { values: number[]; text: (v: number) => string; off: (v: number) => boolean; pick: (v: number) => void };
  groups: BarGroup[] | null;
  why: BarPill;
}) {
  const laid = groups ? lay(w, groups) : null;
  const top = (line: number) => ROW + 6 + line * (SLOT_H + CHIP_H + 20);
  const slotBox = (i: number) => {
    const b = laid!.at[i];
    return { x: b.x, y: top(b.line), w: b.w, h: SLOT_H };
  };
  const { drag, begin, svgProps } = useDrag<Grab>((d) => {
    if ("card" in d) {
      const v = cards!.values[d.card];
      // Let go up in the picture, or tapped.
      if (!d.moved || d.y < 0) cards!.pick(v);
      return;
    }
    const gr = groups![d.g];
    const b = slotBox(d.g);
    if (!d.moved || inBox({ x: b.x - 10, y: b.y - 10, w: b.w + 20, h: b.h + 20 }, d.x, d.y)) gr.pick(d.o);
  });
  let px = 16;
  const pillAt = (s: string) => {
    const x = px;
    px += pillW(s) + 8;
    return x;
  };
  const height = barHeight(w, groups);
  return (
    <svg x={0} y={y} width={w} height={height} overflow="visible" style={{ touchAction: "none" }} {...svgProps}>
      <rect width={w} height={height} fill="#fff" />
      {pills.map((p) => (
        <Pill key={p.text} x={pillAt(p.text)} y={7} w={pillW(p.text)} text={p.text} strong={p.strong} on={p.on} disabled={p.disabled} onTap={p.onTap} />
      ))}
      {cards?.values.map((v, i) => {
        const t = cards.text(v);
        const x = pillAt(t);
        const off = cards.off(v);
        const away = drag && "card" in drag && drag.card === i && drag.moved;
        return (
          <g key={v} role="button" tabIndex={off ? -1 : 0} aria-label={t} aria-disabled={off || undefined} opacity={off ? 0.4 : away ? 0.3 : 1}
            style={{ cursor: off ? "default" : "grab" }} onPointerDown={(e) => !off && begin(e, { card: i })} onKeyDown={(e) => keyTap(e, () => !off && cards.pick(v))}>
            <rect x={x} y={7} width={pillW(t)} height={30} rx={8} fill="#fff" stroke={BLUE} strokeWidth={1.5} />
            <text x={x + pillW(t) / 2} y={27} fontSize={16} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{t}</text>
          </g>
        );
      })}
      <Pill x={w - 16 - pillW(why.text)} y={7} w={pillW(why.text)} text={why.text} on={why.on} onTap={why.onTap} />
      {groups?.map((gr, i) => {
        const s = slotBox(i);
        const hot = drag?.moved && "g" in drag && drag.g === i;
        let cx = s.x + (s.w - gr.options.reduce((a, o) => a + chipW(gr.text(o)) + 4, -4)) / 2;
        return (
          <g key={gr.label}>
            {gr.before && <text x={s.x - SIGN / 2} y={s.y + SLOT_H / 2 + 7} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>{gr.before}</text>}
            <g role="button" tabIndex={gr.on ? 0 : -1} aria-label={`${gr.label}: ${gr.on ? gr.text(gr.on) : "?"}`} style={{ cursor: gr.on ? "pointer" : "default" }}
              onPointerDown={(e) => e.stopPropagation()} onClick={() => gr.on && gr.pick(null)} onKeyDown={(e) => keyTap(e, () => gr.on && gr.pick(null))}>
              <title>{gr.label}</title>
              <rect x={s.x} y={s.y} width={s.w} height={SLOT_H} rx={8} fill={hot ? "#e7f5ff" : gr.on ? "#fff" : "#f8f9fa"} stroke={gr.on ? BLUE : "#adb5bd"} strokeWidth={gr.on ? 2 : 1.5} strokeDasharray={gr.on ? undefined : "5 4"} />
              <text x={s.x + s.w / 2} y={s.y + SLOT_H / 2 + 6} fontSize={17} fontWeight={700} textAnchor="middle" fill={gr.on ? (gr.color?.(gr.on) ?? INK) : MUTED} pointerEvents="none">
                {gr.on ? gr.text(gr.on) : "?"}
              </text>
            </g>
            <g role="group" aria-label={gr.label}>
              {gr.options.map((o) => {
                const t = gr.text(o);
                const x = cx;
                cx += chipW(t) + 4;
                const off = gr.off?.(o) ?? false;
                const chosen = gr.on === o;
                return (
                  <g key={o} role="button" tabIndex={off ? -1 : 0} aria-label={t} aria-pressed={chosen} aria-disabled={off || undefined} opacity={off ? 0.35 : 1}
                    style={{ cursor: off ? "default" : "grab" }} onPointerDown={(e) => !off && begin(e, { g: i, o })} onKeyDown={(e) => keyTap(e, () => !off && gr.pick(o))}>
                    <rect x={x} y={s.y + SLOT_H + 8} width={chipW(t)} height={CHIP_H} rx={7} fill={chosen ? "#e7f5ff" : "#fff"} stroke={chosen ? BLUE : "#ced4da"} strokeWidth={1.5} />
                    <text x={x + chipW(t) / 2} y={s.y + SLOT_H + 8 + CHIP_H / 2 + 6} fontSize={16} fontWeight={700} textAnchor="middle" fill={gr.color?.(o) ?? INK} pointerEvents="none">{t}</text>
                  </g>
                );
              })}
            </g>
          </g>
        );
      })}
      {drag?.moved && (() => {
        const t = "card" in drag ? cards!.text(cards!.values[drag.card]) : groups![drag.g].text(drag.o);
        const up = "card" in drag && drag.y < 0;
        return (
          <g pointerEvents="none" opacity={0.9}>
            <rect x={drag.x - chipW(t) / 2} y={drag.y - 16} width={chipW(t)} height={32} rx={8} fill={up ? "#ebfbee" : "#fff"} stroke={"card" in drag && !up ? RED : BLUE} strokeWidth={2} />
            <text x={drag.x} y={drag.y + 6} fontSize={16} fontWeight={700} textAnchor="middle" fill={INK}>{t}</text>
          </g>
        );
      })()}
    </svg>
  );
}
