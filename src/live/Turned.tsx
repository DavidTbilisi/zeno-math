// A solid of revolution on the board (#567), made by hand: the flat region is dragged round its axis by the handle on
// its rim and the solid is swept out as far as it goes; the limits a and b are blue handles on the axis; the slices
// box cuts it into discs, washers or shells whose sum closes in on the volume; a tap on a slab pulls it out to read
// π r² Δx with the numbers in. The region comes from the tray at the top; the stage is dragged to look round it.
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { approx } from "../math/expr";
import { add, type V3 } from "../math/solid";
import {
  moveLimit, pickPreset, place, pullOffset, rimPoint, setSlices, slabFaces, slabSum, smoothFaces, SLICES, TURNED_PRESETS, turnedRevolution,
  presetOf, type LiveTurned, type TurnedFace, type TurnedPreset, type TurnedTag,
} from "../math/turned";
import { useI18n } from "../i18n";
import { BLUE, keyTap, NumBox, PillRows, pillRowsH, RED, useDrag, type RowItem } from "./hand";
import { clamp, fit, FlatFace, lay, PITCH_RANGE, projector, wrap360 } from "./stage3d";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 640;
const ROWS_Y = 8;
const COLORS: Record<TurnedTag, string> = { region: "#74c0fc", outer: "#ffd8a8", inner: "#ffe8cc", end: "#ffc078", slab: "#ffec99", pulled: "#ffa8a8" };
const PX = 60;

type Hold =
  | { part: "turn"; yaw0: number; pitch0: number; slab?: number }
  | { part: "value"; id: "sweep" | "a" | "b"; v0: number; sx: number; sy: number; px: number };

export function Turned({ state, set, w: words, svgRef }: PieceProps<"turned">) {
  const w = words.turned;
  const { t } = useI18n();
  const rw = t.revWords;
  const [draft, setDraft] = useState<LiveTurned | null>(null);
  const s = draft ?? state;
  const p = presetOf(s.preset);
  const view = { yaw: s.yaw, pitch: s.pitch };
  const made = turnedRevolution(s, rw);
  const r = "ok" in made ? made.ok : null;

  const keep = (next: LiveTurned) => {
    setDraft(null);
    set(next);
  };

  const items: RowItem[] = TURNED_PRESETS.map((x) => ({ text: rw.presets[x.key], on: x.key === s.preset, onTap: () => keep(pickPreset(s, x.key as TurnedPreset)) }));
  const rowsH = pillRowsH(items, W - 120);
  const ST = ROWS_Y + rowsH + 10;
  const SH = 420;
  const [CX, CY] = [W / 2, ST + SH / 2];
  const SAY_Y = ST + SH + 26;

  const faces: TurnedFace[] = useMemo(
    () => (r ? (s.slices > 0 ? slabFaces(r, p.axis, s.sweep, s.pulled) : smoothFaces(r, p.axis, s.sweep)) : []),
    [r, p.axis, s.sweep, s.slices, s.pulled],
  );
  // The stage fits the whole turned solid (and a pulled slab), so the picture keeps still while it is swept round.
  const whole = useMemo(() => {
    if (!r) return fit([]);
    const pts: V3[] = [];
    for (const c of r.columns.filter((_, i) => i % 8 === 0)) {
      for (let k = 0; k < 12; k++) {
        const th = (k / 12) * 2 * Math.PI;
        pts.push(place(p.axis, c.x, c.hi, th), place(p.axis, c.x, c.lo, th));
      }
    }
    if (s.pulled !== null) pts.push(...pts.map((q) => add(q, pullOffset(r, p.axis))));
    return fit(pts);
  }, [r, p.axis, s.pulled]);

  const { drag, begin, svgProps } = useDrag<Hold>(
    (d) => {
      // A tap on a slab pulls it out, or puts it back.
      if (d.part === "turn" && !d.moved && d.slab !== undefined) return keep({ ...s, pulled: s.pulled === d.slab ? null : d.slab });
      if (draft) keep(draft);
    },
    (d) => {
      if (!d.moved) return;
      const [dx, dy] = [d.x - d.x0, d.y - d.y0];
      if (d.part === "turn") return setDraft({ ...s, yaw: wrap360(d.yaw0 - dx * 0.6), pitch: clamp(Math.round(d.pitch0 + dy * 0.5), PITCH_RANGE[0], PITCH_RANGE[1]) });
      const v = d.v0 + (dx * d.sx + dy * d.sy) / (d.sx * d.sx + d.sy * d.sy);
      if (d.id === "sweep") return setDraft({ ...s, sweep: clamp(Math.round(v / 5) * 5, 0, 360) });
      setDraft(moveLimit(s, d.id, v, rw));
    },
  );
  const px = drag?.part === "value" ? drag.px : Math.min(PX, (SH / 2 - 24) / whole.reach);
  const at = projector(view, whole.middle, px, CX, CY);

  const flats = useMemo(
    () => lay(faces, view, at, (f) => ({ color: COLORS[f.tag], stroke: f.tag === "region" || f.tag === "pulled" || f.tag === "slab" ? INK : undefined, width: f.tag === "region" ? 1.4 : 0.5, opacity: f.tag === "region" ? 0.9 : 1 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [faces, s.yaw, s.pitch, px, whole],
  );

  // ---- handles ----------------------------------------------------------------------------------------------------
  type Handle = { id: "sweep" | "a" | "b"; name: string; label: string; at: V3; way: V3; value: number; color: string };
  const handles: Handle[] = r ? [
    { id: "sweep", name: w.sweepName, label: `${s.sweep}°`, ...rimPoint(r, p.axis, s.sweep), value: s.sweep, color: RED },
    { id: "a", name: fill(w.limitName, { x: "a" }), label: `a = ${approx(s.a)}`, at: [s.a, 0, 0], way: [1, 0, 0], value: s.a, color: BLUE },
    { id: "b", name: fill(w.limitName, { x: "b" }), label: `b = ${approx(s.b)}`, at: [s.b, 0, 0], way: [1, 0, 0], value: s.b, color: BLUE },
  ] : [];
  const grab = (h: Handle) => (e: PointerEvent) => {
    const [x0, y0] = at(h.at);
    const [x1, y1] = at(add(h.at, h.way));
    const [sx, sy] = [x1 - x0, y1 - y0];
    if (sx * sx + sy * sy < 0.01) return begin(e, { part: "turn", yaw0: s.yaw, pitch0: s.pitch });
    begin(e, { part: "value", id: h.id, v0: h.value, sx, sy, px });
  };
  const keyHandle = (h: Handle) => (e: KeyboardEvent) => {
    const step = h.id === "sweep" ? 15 : 0.5;
    const by = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    keep(h.id === "sweep" ? { ...s, sweep: clamp(s.sweep + by, 0, 360) } : moveLimit(s, h.id, h.value + by, rw));
  };
  const keyTurn = (e: KeyboardEvent) => {
    const by: Record<string, [number, number]> = { ArrowLeft: [15, 0], ArrowRight: [-15, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
    const m = by[e.key];
    if (!m) return;
    e.preventDefault();
    e.stopPropagation();
    keep({ ...s, yaw: wrap360(s.yaw + m[0]), pitch: clamp(s.pitch + m[1], PITCH_RANGE[0], PITCH_RANGE[1]) });
  };

  // A tap on a slab pulls it out (or puts it back); a drag on it turns the stage.
  const slabOf = (i: number) => faces[Number(flats[i].key)]?.group ?? 0;
  const pressFace = (i: number) => (e: PointerEvent) => {
    const g = slabOf(i);
    begin(e, { part: "turn", yaw0: s.yaw, pitch0: s.pitch, slab: s.slices > 0 && g > 0 ? g - 1 : undefined });
  };

  // ---- words ------------------------------------------------------------------------------------------------------
  const lines: { text: string; color: string; strong?: boolean }[] = [];
  if (r) {
    const integral = r.method === "disc" ? "V = π∫ f(x)² dx" : r.method === "washer" ? "V = π∫ (R² − r²) dx" : "V = 2π∫ x · f(x) dx";
    lines.push({ text: `${p.g ? `f(x) = ${p.f.replace("^2", "²")}, g(x) = ${p.g.replace("^2", "²")}` : `f(x) = ${p.f.replace("^2", "²")}`}, ${approx(r.a)} ≤ x ≤ ${approx(r.b)}, ${p.axis === "x" ? rw.axisX : rw.axisY}`, color: INK });
    lines.push({ text: `${integral} ${r.exact ? `= ${r.exact} ` : ""}≈ ${approx(r.volume)}`, color: BLUE, strong: true });
    if (s.slices > 0) {
      lines.push({ text: fill(rw.slabSum, { m: rw.methods[r.method], n: s.slices, v: approx(r.approx) }) + ` (${fill(w.off, { d: approx(Math.abs(r.approx - r.volume)) })})`, color: INK, strong: true });
      if (s.pulled !== null && s.pulled < r.slabs.length) lines.push({ text: fill(w.pulledLine, { k: s.pulled + 1, sum: slabSum(r, p.axis, s.pulled) }), color: RED, strong: true });
      else lines.push({ text: w.pullHint, color: INK });
    } else if (s.sweep < 360) {
      lines.push({ text: w.sweepHint, color: INK });
    } else {
      lines.push({ text: w.slicesHint, color: INK });
    }
  } else if ("error" in made) {
    lines.push({ text: made.error, color: RED });
  }

  const sizeLabel = (h: Handle) => {
    const [x, y] = at(h.at);
    const dy = h.id === "sweep" ? -18 : 26;
    return <text key={h.id} x={x} y={y + dy} fontSize={14} fontWeight={700} fill={h.color} textAnchor="middle" stroke="#fff" strokeWidth={4} paintOrder="stroke" pointerEvents="none">{h.label}</text>;
  };

  const axisLine = () => {
    if (!r) return null;
    const [lo, hi] = p.axis === "x" ? [Math.min(r.a, 0) - 1, Math.max(r.b, 0) + 1] : [r.along[0] - 1, r.along[1] + 1];
    const ends: [V3, V3] = p.axis === "x" ? [[lo, 0, 0], [hi, 0, 0]] : [[0, 0, lo], [0, 0, hi]];
    const [[x0, y0], [x1, y1]] = ends.map(at);
    return <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK} strokeWidth={1.6} strokeDasharray="8 5" pointerEvents="none" />;
  };

  const H = SAY_Y + 4 * 24;
  const picture = (live: boolean) => (
    <>
      {axisLine()}
      {flats.map((f, i) => <FlatFace key={i} f={f} onPointerDown={live ? pressFace(i) : undefined} />)}
      {handles.map(sizeLabel)}
      {lines.map((l, i) => <text key={i} x={24} y={SAY_Y + i * 24} fontSize={15} fontWeight={l.strong ? 700 : 400} fill={l.color}>{l.text}</text>)}
    </>
  );

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={lines.map((l) => l.text).join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <PillRows y={ROWS_Y} w={W - 120} items={items} />
        <NumBox x={W - 104} y={ROWS_Y} w={88} h={40} size={18} value={s.slices} min={SLICES[0]} max={SLICES[1]} label={rw.slices} show={(v) => (v === 0 ? rw.smooth : `n = ${v}`)} onChange={(n) => keep(setSlices(s, n))} />
        <g role="slider" tabIndex={0} aria-label={w.turnName} aria-valuemin={0} aria-valuemax={359} aria-valuenow={s.yaw} aria-valuetext={`${s.yaw}°, ${s.pitch}°`}
          onKeyDown={keyTurn} style={{ cursor: drag?.part === "turn" ? "grabbing" : "grab" }}
          onPointerDown={(e) => begin(e, { part: "turn", yaw0: s.yaw, pitch0: s.pitch })}>
          <title>{w.turnName}</title>
          <rect x={0} y={ST} width={W} height={SH} fill="transparent" />
        </g>
        <g style={{ cursor: "grab" }}>{picture(true)}</g>
        {s.slices > 0 && r && (
          <g role="slider" tabIndex={0} aria-label={w.pullName} aria-valuemin={0} aria-valuemax={r.slabs.length} aria-valuenow={s.pulled === null ? 0 : s.pulled + 1}
            onKeyDown={(e) => {
              keyTap(e, () => keep({ ...s, pulled: s.pulled === null ? 0 : null }));
              const to = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
              if (to === undefined) return;
              e.preventDefault();
              e.stopPropagation();
              const k = (s.pulled ?? -1) + to;
              keep({ ...s, pulled: k < 0 || k >= r.slabs.length ? null : k });
            }}>
            <title>{w.pullName}</title>
          </g>
        )}
        {handles.map((h) => {
          const [x, y] = at(h.at);
          const held = drag?.part === "value" && drag.id === h.id;
          return (
            <g key={h.id} role="slider" tabIndex={0} aria-label={h.name} aria-valuenow={h.value} aria-valuemin={h.id === "sweep" ? 0 : -12} aria-valuemax={h.id === "sweep" ? 360 : 12}
              style={{ cursor: held ? "grabbing" : "grab" }} onPointerDown={grab(h)} onKeyDown={keyHandle(h)}>
              <title>{h.name}</title>
              <circle cx={x} cy={y} r={held ? 10 : 8} fill="#fff" stroke={h.color} strokeWidth={3} />
              <circle cx={x} cy={y} r={18} fill="transparent" />
            </g>
          );
        })}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={H - ST} viewBox={`0 ${ST} ${W} ${H - ST}`} fontFamily={FONT}>
          <rect y={ST} width={W} height={H - ST} fill="#fff" />
          {picture(false)}
        </svg>
      </div>
    </>
  );
}
