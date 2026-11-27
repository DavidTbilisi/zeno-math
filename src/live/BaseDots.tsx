// Number bases by skip counting (#862): the place-value row of base 2 or 3, high on the left. Two dots ride under it:
// drag the first to where the dots start, the second to every k-th column; the rest follow, and arcs between them
// show the ×b^k jump. A number sits under the row, a digit per column (tap to change it); with the dots from 1 its
// digits close into groups of k, each one digit of base b^k, and the sum shows why.
import type { KeyboardEvent } from "react";
import { BASE3_DIGITS, BASE_START, COLS, MAX_K, digitChar, dotCols, groups, placeValue, valueOf, type LiveBaseDots } from "../math/baseDots";
import { BLUE, GREEN, MUTED, RED, Tabs, keyTap, useDrag } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const CW = 74;
const RY = 70;
const DY = 182;
const NY = 230;
const H = 380;
const TINT = ["#d0ebff", "#fff3bf", "#d3f9d8", "#ffe3e3"];

export function BaseDots({ state, set, w: words, svgRef }: PieceProps<"baseDots">) {
  const w = words.baseDots;
  const d = state;
  const b = d.base;
  const cols = COLS[b];
  const x0 = (W - cols * CW) / 2;
  /** Column n (b^n) sits n places from the right. */
  const cx = (n: number) => x0 + (cols - 1 - n) * CW + CW / 2;
  const colAt = (x: number) => Math.max(0, Math.min(cols - 1, cols - 1 - Math.floor((x - x0) / CW)));
  const dots = dotCols(cols, d.start, d.k);
  const B = b ** d.k;
  const N = valueOf(d.digits, b);
  const gs = groups(d.digits, b, d.k);

  const put = (patch: Partial<LiveBaseDots>) => set({ ...d, ...patch });
  const rebase = (to: "2" | "3") => {
    const nb = Number(to) as 2 | 3;
    if (nb !== b) put({ base: nb, start: 0, k: Math.min(d.k, MAX_K[nb]), digits: nb === 2 ? BASE_START.digits : BASE3_DIGITS });
  };
  const turn = (n: number) => put({ digits: d.digits.map((v, i) => (i === n ? (v + 1) % b : v)) });
  const { drag, begin, svgProps } = useDrag<{ which: "first" | "second" }>((h) => {
    const n = colAt(h.x);
    if (h.which === "first") put({ start: Math.min(n, cols - 2) });
    else put({ k: Math.max(1, Math.min(MAX_K[b], n - d.start)) });
  });
  // While a dot is dragged, show where it would land.
  const live = drag?.moved ? (drag.which === "first" ? { start: Math.min(colAt(drag.x), cols - 2), k: d.k } : { start: d.start, k: Math.max(1, Math.min(MAX_K[b], colAt(drag.x) - d.start)) }) : null;
  const shown = live ? dotCols(cols, live.start, live.k) : dots;
  const shownB = b ** (live?.k ?? d.k);

  const grouped = d.start === 0;
  const numText = [...d.digits].reverse().join("");
  const say = grouped
    ? fill(w.grouped, { num: numText, b, groups: gs.map((g) => [...g.digits].reverse().join("")).join(" | "), out: gs.map((g) => digitChar(g.value)).join(""), B, n: N })
    : fill(w.shifted, { v: placeValue(b, d.start), B, s: d.start });
  const sum = grouped ? `${gs.map((g, i) => `${g.value}·${B}${sup(gs.length - 1 - i)}`).join(" + ")} = ${N}` : "";

  return (
    <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ userSelect: "none", touchAction: "none" }} {...svgProps}>
      <rect width={W} height={H} fill="#fff" />
      <Tabs x={10} y={8} keys={["2", "3"] as const} on={String(b) as "2" | "3"} names={{ "2": fill(w.base, { b: 2 }), "3": fill(w.base, { b: 3 }) }} onPick={rebase} />
      <text x={W - 10} y={30} fontSize={14} fontWeight={700} textAnchor="end" fill={grouped ? GREEN : RED} data-newbase={grouped ? B : ""}>
        {fill(grouped ? w.newBase : w.notGrouped, { k: d.k, b, B, name: w.names[String(B) as keyof typeof w.names] ?? fill(w.baseN, { B }) })}
      </text>

      {/* The place values, b^n over b^n's value, the dotted ones lit. */}
      {Array.from({ length: cols }, (_, n) => {
        const on = shown.includes(n);
        const group = grouped ? Math.floor(n / d.k) : -1;
        return (
          <g key={n} data-col={n} data-dot={on ? "1" : "0"}>
            <rect x={cx(n) - CW / 2 + 3} y={RY} width={CW - 6} height={54} rx={8} fill={on ? "#e7f5ff" : "#f8f9fa"} stroke={on ? BLUE : "#dee2e6"} strokeWidth={on ? 2 : 1} />
            <text x={cx(n)} y={RY + 20} fontSize={12} textAnchor="middle" fill={MUTED}>{`${b}${sup(n)}`}</text>
            <text x={cx(n)} y={RY + 43} fontSize={18} fontWeight={700} textAnchor="middle" fill={INK}>{placeValue(b, n)}</text>
            {grouped && <rect x={cx(n) - CW / 2 + 3} y={NY} width={CW - 6} height={50} rx={8} fill={TINT[group % TINT.length]} />}
          </g>
        );
      })}

      {/* The dots, and the jump between each pair. */}
      {shown.slice(1).map((n, i) => {
        const [a, c] = [cx(shown[i]), cx(n)];
        return (
          <g key={`j${n}`} pointerEvents="none">
            <path d={`M${a},${DY - 14} Q${(a + c) / 2},${DY - 50} ${c},${DY - 14}`} fill="none" stroke={BLUE} strokeWidth={2} markerEnd="url(#bdArrow)" />
            <text x={(a + c) / 2} y={DY - 38} fontSize={13} fontWeight={700} textAnchor="middle" fill={BLUE}>{`×${shownB}`}</text>
          </g>
        );
      })}
      <defs>
        <marker id="bdArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={BLUE} />
        </marker>
      </defs>
      {shown.map((n, i) => {
        const handle = i < 2 ? (i === 0 ? "first" : "second") : null;
        return (
          <g key={`d${n}`} data-dotcol={n} role={handle ? "slider" : undefined} tabIndex={handle ? 0 : undefined}
            aria-label={handle ? fill(handle === "first" ? w.firstDot : w.secondDot, { v: placeValue(b, n) }) : undefined}
            aria-valuenow={handle ? (handle === "first" ? d.start : d.k) : undefined}
            style={{ cursor: handle ? "grab" : "default" }}
            onPointerDown={handle ? (e) => begin(e, { which: handle }) : undefined}
            onKeyDown={handle ? (e: KeyboardEvent) => {
              const by = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0;
              if (!by) return;
              e.preventDefault();
              if (handle === "first") put({ start: Math.max(0, Math.min(cols - 2, d.start + by)) });
              else put({ k: Math.max(1, Math.min(MAX_K[b], d.k + by)) });
            } : undefined}>
            <circle cx={cx(n)} cy={DY} r={handle ? 14 : 10} fill={handle ? BLUE : "#74c0fc"} stroke="#fff" strokeWidth={2} />
          </g>
        );
      })}
      {drag?.moved && <circle cx={drag.x} cy={DY} r={14} fill="none" stroke={BLUE} strokeDasharray="4 3" pointerEvents="none" />}

      {/* The number: a digit per column, tap to change; grouped by colour when the dots start at 1. */}
      <text x={x0 - 8} y={NY + 32} fontSize={11} textAnchor="end" fill={MUTED}>{w.number}</text>
      {d.digits.map((v, n) => (
        <g key={n} data-digit={n} role="button" tabIndex={0} aria-label={fill(w.digitName, { v: placeValue(b, n), d: v })} style={{ cursor: "pointer" }}
          onClick={() => turn(n)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => turn(n))}>
          <rect x={cx(n) - 22} y={NY + 5} width={44} height={40} rx={6} fill="#fff" stroke="#868e96" />
          <text x={cx(n)} y={NY + 33} fontSize={22} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{v}</text>
        </g>
      ))}
      {grouped && gs.map((g, i) => {
        const hi = (gs.length - 1 - i) * d.k;
        const lo = Math.min(cols - 1, hi + d.k - 1);
        const [left, right] = [cx(lo) - CW / 2 + 6, cx(hi) + CW / 2 - 6];
        return (
          <g key={`g${i}`} data-group={i} data-value={g.value} pointerEvents="none">
            <path d={`M${left},${NY + 56} v8 H${right} v-8`} fill="none" stroke={INK} strokeWidth={1.5} />
            <text x={(left + right) / 2} y={NY + 86} fontSize={20} fontWeight={700} textAnchor="middle" fill={BLUE}>{digitChar(g.value)}</text>
          </g>
        );
      })}

      <text x={W / 2} y={H - 34} fontSize={13} fontWeight={700} textAnchor="middle" fill={grouped ? INK : RED} data-read={grouped ? gs.map((g) => digitChar(g.value)).join("") : ""}>{say}</text>
      {grouped && <text x={W / 2} y={H - 12} fontSize={12} textAnchor="middle" fill={MUTED}>{fill(w.why, { sum })}</text>}
    </svg>
  );
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
function sup(n: number) {
  return String(n).split("").map((c) => SUP[Number(c)]).join("");
}
