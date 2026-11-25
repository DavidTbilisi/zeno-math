// Fat tails. The normal curve in grey and t in blue for a sample of n, with the 95 % cuts of both marked: drag n and
// watch t's tails thin and its cut t* close in on 1.96. Under the curves, how often an interval built with 1.96 would
// really catch the mean: far below 95 % for a tiny sample, nearly 95 % from about thirty on.
import { tPdf, tStar, TTAILS_MAX, TTAILS_MIN, TTAILS_NEAR, zCover, zPdf } from "../math/tTails";
import { BLUE, GREEN, MUTED, Track, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const CX = 350;
const UX = 62;
const BASE = 250;
const UY = 520;
const SAY_Y = 390;
const H = SAY_Y + 3 * 25 + 8;
const X = (x: number) => CX + x * UX;
const Y = (p: number) => BASE - p * UY;

/** A curve from −5 to 5 as a path, and the same closed off over its two tails beyond ±c. */
function paths(f: (x: number) => number, c: number) {
  const xs = Array.from({ length: 201 }, (_, i) => -5 + i * 0.05);
  const line = xs.map((x, i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(f(x)).toFixed(1)}`).join("");
  const tail = (a: number, b: number) => {
    const pts = xs.filter((x) => x >= a && x <= b);
    return `M${X(a)} ${BASE}` + [a, ...pts, b].map((x) => `L${X(x).toFixed(1)} ${Y(f(x)).toFixed(1)}`).join("") + `L${X(b)} ${BASE}Z`;
  };
  return { line, tails: tail(-5, -c) + tail(c, 5) };
}

export function TTails({ state, set, w: words, svgRef }: PieceProps<"tTails">) {
  const w = words.tTails;
  const df = state.n - 1;
  const ts = tStar(df);
  const t = paths((x) => tPdf(x, df), ts);
  const z = paths(zPdf, 1.96);
  const near = state.n >= TTAILS_NEAR;
  const c = (100 * zCover(df)).toFixed(1);
  const say = wrapWords(fill(near ? w.done : w.start, { n: state.n, t: ts.toFixed(3), c }), 74);
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <g pointerEvents="none">
          <path d={t.tails} fill={BLUE} fillOpacity={0.25} />
          <path d={z.line} fill="none" stroke={MUTED} strokeWidth={2} strokeDasharray="6 4" />
          <path d={t.line} fill="none" stroke={near ? GREEN : BLUE} strokeWidth={3} />
          <line x1={X(-5)} y1={BASE} x2={X(5)} y2={BASE} stroke={INK} strokeWidth={1.5} />
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((v) => (
            <g key={v}>
              <line x1={X(v)} y1={BASE} x2={X(v)} y2={BASE + 5} stroke={INK} />
              <text x={X(v)} y={BASE + 19} fontSize={12} textAnchor="middle" fill={MUTED}>{v < 0 ? `−${-v}` : v}</text>
            </g>
          ))}
          {/* The two pairs of cuts: 1.96 for the normal, t* for t (off the picture past 5). */}
          {[-1, 1].map((s) => (
            <g key={s}>
              <line x1={X(s * 1.96)} y1={BASE - 150} x2={X(s * 1.96)} y2={BASE} stroke={MUTED} strokeWidth={1.5} />
              {ts < 5 && <line x1={X(s * ts)} y1={BASE - 110} x2={X(s * ts)} y2={BASE} stroke={BLUE} strokeWidth={2.5} />}
            </g>
          ))}
          <text x={X(1.96) + 6} y={BASE - 140} fontSize={14} fill={MUTED}>{w.normal}</text>
          <text x={X(Math.min(ts, 4.6)) + 6} y={BASE - 96} fontSize={14} fontWeight={700} fill={BLUE}>{fill(w.tLabel, { df, t: ts.toFixed(3) })}</text>
          <text x={24} y={30} fontSize={15} fill={INK}>{fill(w.cover, { c })}</text>
        </g>
        <Track x={24} y={300} w={652} value={state.n} min={TTAILS_MIN} max={TTAILS_MAX} label={w.nLabel} show={(v) => fill(w.n, { n: v })}
          onChange={(n) => n !== state.n && set({ n })} />
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={16} fill={near ? GREEN : INK} pointerEvents="none">{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
