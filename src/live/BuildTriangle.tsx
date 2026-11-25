// Build the triangle: a base and three given parts, drawn as where the top corner may go: a circle for a side from one
// end, a ray for an angle at one end. Drag the top corner; where it meets all the parts it clicks in and the triangle
// fills. SSS, SAS and ASA have one such place, so only one triangle fits; SSA has two, two different triangles; AAA has
// one for every length of base (drag the base's end), the same shape in every size. That is why the first three are
// tests of congruence and the last two are not.
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { BASE_A, BASE_LEN, BUILD_TESTS, GIVEN, SNAP, spots, type LiveBuildTriangle } from "../math/congruence";
import { BLUE, GREEN, Tabs, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 640;
const SAY_Y = 400;
const H = SAY_Y + 5 * 25 + 8;
const PURPLE = "#9c36b5";
const ORANGE = "#e8590c";
const rad = (d: number) => (d * Math.PI) / 180;
type Hold = { part: "corner" | "end" };

export function BuildTriangle({ state, set, w: words, svgRef }: PieceProps<"buildTriangle">) {
  const w = words.buildTriangle;
  const [draft, setDraft] = useState<LiveBuildTriangle | null>(null);
  const d = draft ?? state;
  const [ax, ay] = BASE_A;
  const bx = d.test === "AAA" ? d.bx : ax + BASE_LEN;
  const places = spots(d);
  const at = places.findIndex((p) => Math.hypot(p[0] - d.c[0], p[1] - d.c[1]) < SNAP);
  const corner: [number, number] = at >= 0 ? places[at] : d.c;
  /** Places found so far; for AAA a size counts once it has been fitted. */
  const found = d.test === "AAA" ? d.found.length : new Set(d.found).size;

  const note = (s: LiveBuildTriangle): LiveBuildTriangle => {
    const ps = spots(s);
    const i = ps.findIndex((p) => Math.hypot(p[0] - s.c[0], p[1] - s.c[1]) < SNAP);
    if (i < 0) return s;
    const key = s.test === "AAA" ? Math.round(s.bx) : i;
    return s.found.includes(key) ? { ...s, c: ps[i] } : { ...s, c: ps[i], found: [...s.found, key] };
  };
  const { drag, begin, svgProps } = useDrag<Hold>(
    () => {
      if (draft) set(note(draft));
      setDraft(null);
    },
    (h) => {
      if (!h.moved) return;
      if (h.part === "corner") return setDraft({ ...d, c: [Math.max(20, Math.min(W - 20, h.x)), Math.max(20, Math.min(SAY_Y - 40, h.y))] });
      // The base's end slides along the line; the corner keeps its place on the rays, so the triangle grows with it.
      const nbx = Math.max(ax + 120, Math.min(W - 40, h.x));
      const moved = { ...d, bx: nbx };
      setDraft(at >= 0 ? { ...moved, c: spots(moved)[0] } : moved);
    },
  );
  const grab = (part: Hold["part"]) => (e: PointerEvent) => begin(e, { part });
  const keys = (e: KeyboardEvent) => {
    const v = { ArrowRight: [4, 0], ArrowLeft: [-4, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
    if (!v) return;
    e.preventDefault();
    e.stopPropagation();
    set(note({ ...d, c: [d.c[0] + v[0], d.c[1] + v[1]] }));
  };

  // The parts, drawn where the corner may go.
  const ray = (x: number, y: number, deg: number, key: string) => (
    <line key={key} x1={x} y1={y} x2={x + 520 * Math.cos(rad(deg))} y2={y - 520 * Math.sin(rad(deg))} stroke={PURPLE} strokeWidth={2} strokeDasharray="7 6" />
  );
  const circle = (x: number, y: number, r: number, key: string) => <circle key={key} cx={x} cy={y} r={r} fill="none" stroke={ORANGE} strokeWidth={2} strokeDasharray="7 6" />;
  const loci =
    d.test === "SSS" ? [circle(ax, ay, GIVEN.b, "b"), circle(bx, ay, GIVEN.a, "a")]
    : d.test === "SAS" ? [ray(ax, ay, GIVEN.A, "A"), circle(ax, ay, GIVEN.b, "b")]
    : d.test === "ASA" || d.test === "AAA" ? [ray(ax, ay, GIVEN.A, "A"), ray(bx, ay, 180 - GIVEN.B, "B")]
    : [ray(ax, ay, GIVEN.ssaA, "A"), circle(bx, ay, GIVEN.a, "a")];
  const fits = at >= 0;
  const total = d.test === "AAA" ? null : places.length;
  const given = wrapWords(fill(w.parts[d.test], { b: GIVEN.b, a: GIVEN.a, A: GIVEN.A, B: GIVEN.B, s: GIVEN.ssaA, c: BASE_LEN }), 62);
  const say = [
    ...given,
    ...wrapWords(
      d.test === "AAA" ? (found >= 2 ? w.aaaMany : fits ? w.aaaOne : w.drag)
      : found === 0 ? w.drag
      : found < total! ? fill(w.more, { n: found })
      : total === 1 ? fill(w.one, { t: d.test }) : w.two,
      72,
    ),
  ];
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={14} keys={BUILD_TESTS} on={d.test} names={Object.fromEntries(BUILD_TESTS.map((t) => [t, t])) as Record<LiveBuildTriangle["test"], string>}
          onPick={(test) => set({ ...state, test, found: [], c: [300, 150], bx: ax + BASE_LEN })} />
        {loci}
        {/* The parts' circles reach below the base: the words below are kept clear of them. */}
        <rect x={0} y={SAY_Y - 28} width={W} height={H - SAY_Y + 28} fill="#fff" />
        {/* The places found so far, ringed. */}
        {(d.test === "AAA" ? [] : places).map((p, i) => d.found.includes(i) && <circle key={i} cx={p[0]} cy={p[1]} r={10} fill="none" stroke={GREEN} strokeWidth={2.5} />)}
        <polygon points={`${ax},${ay} ${bx},${ay} ${corner[0]},${corner[1]}`} fill={fits ? GREEN : BLUE} fillOpacity={fits ? 0.3 : 0.1} stroke={fits ? GREEN : BLUE} strokeWidth={fits ? 3 : 2} strokeDasharray={fits ? undefined : "4 4"} />
        <line x1={ax} y1={ay} x2={bx} y2={ay} stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <text x={(ax + bx) / 2} y={ay + 24} fontSize={15} fontWeight={700} textAnchor="middle" fill={INK}>{d.test === "AAA" ? "" : `${BASE_LEN}`}</text>
        {d.test === "AAA" && (
          <g role="slider" tabIndex={0} aria-label={w.endName} aria-valuenow={Math.round(bx)} style={{ cursor: "ew-resize" }} onPointerDown={grab("end")}
            onKeyDown={(e) => {
              const v = { ArrowRight: 10, ArrowLeft: -10 }[e.key];
              if (!v) return;
              e.preventDefault();
              e.stopPropagation();
              const moved = { ...d, bx: Math.max(ax + 120, Math.min(W - 40, d.bx + v)) };
              set(note(fits ? { ...moved, c: spots(moved)[0] } : moved));
            }}>
            <circle cx={bx} cy={ay} r={10} fill="#fff" stroke={INK} strokeWidth={3} />
            <circle cx={bx} cy={ay} r={22} fill="transparent" />
          </g>
        )}
        <g role="slider" tabIndex={0} aria-label={w.cornerName} aria-valuetext={fits ? w.fitsName : ""} style={{ cursor: drag ? "grabbing" : "grab" }} onPointerDown={grab("corner")} onKeyDown={keys}>
          <circle cx={corner[0]} cy={corner[1]} r={11} fill="#fff" stroke={fits ? GREEN : INK} strokeWidth={3} />
          <circle cx={corner[0]} cy={corner[1]} r={24} fill="transparent" />
        </g>
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={17} fontWeight={i < given.length ? 700 : 400} fill={INK}>{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
