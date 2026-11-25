// Make it a square. x² + bx + c as algebra tiles: a big x² square, b long x strips and c small unit squares. Tap the
// strips and they lie along the square's right side and bottom, half on each; then a corner is missing, (b/2)² small
// squares, and tapping it fills it in. The tiles now make (x + b/2)², but (b/2)² squares were added, so they are taken
// back: x² + bx + c = (x + b/2)² + c − (b/2)², and the least value shows.
import { completed, fillCorner, layStrip, SQUARE_EXPRS } from "../math/quadraticGraph";
import { BLUE, GREEN, keyTap, MUTED, RED, Tabs, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const SX = 50;
const SY = 70;
const XL = 130;
const U = 20;
const SAY_Y = 390;
const H = SAY_Y + 4 * 25 + 8;
const ORANGE = "#e8590c";
const YELLOW = "#ffd43b";
const sgnd = (v: number) => (v < 0 ? `− ${-v}` : `+ ${v}`);

export function CompleteSquare({ state, set, w: words, svgRef }: PieceProps<"completeSquare">) {
  const w = words.completeSquare;
  const { b, c } = SQUARE_EXPRS[state.which];
  const half = b / 2;
  const { h, k } = completed(b, c);
  const all = state.laid === b;
  const expr = `x² + ${b}x + ${c}`;
  const say = wrapWords(
    state.filled
      ? fill(w.done, { h, s: half * half, c, e: expr, k: sgnd(k), m: String(k).replace("-", "−"), x: String(-h).replace("-", "−") })
      : all
        ? fill(w.gap, { h, s: half * half })
        : state.laid
          ? fill(w.laying, { k: state.laid, b })
          : fill(w.start, { e: expr }),
    78,
  );
  // Where the k-th laid strip goes: right side first, then bottom, in turn.
  const at = (i: number) => (i % 2 === 0 ? { x: SX + XL + (i / 2) * U, y: SY, w: U, h: XL } : { x: SX, y: SY + XL + ((i - 1) / 2) * U, w: XL, h: U });
  const tray = { x: 420, y: SY };
  const tap = () => set(layStrip(state));
  const tapCorner = () => set(fillCorner(state));
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={14} keys={SQUARE_EXPRS.map((_, i) => String(i))} on={String(state.which)}
          names={Object.fromEntries(SQUARE_EXPRS.map((e, i) => [i, `x² + ${e.b}x + ${e.c}`]))} onPick={(kk) => set({ which: Number(kk), laid: 0, filled: false })} />
        <g pointerEvents="none">
          <rect x={SX} y={SY} width={XL} height={XL} fill={BLUE} fillOpacity={0.7} stroke={INK} />
          <text x={SX + XL / 2} y={SY + XL / 2 + 8} fontSize={24} fontWeight={700} textAnchor="middle" fill="#fff">x²</text>
          {Array.from({ length: state.laid }, (_, i) => at(i)).map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={GREEN} fillOpacity={0.7} stroke={INK} />
          ))}
          {/* The corner: dashed while missing, small squares once filled. */}
          {all && !state.filled && <rect x={SX + XL} y={SY + XL} width={half * U} height={half * U} fill="none" stroke={RED} strokeWidth={2.5} strokeDasharray="6 4" />}
          {state.filled && Array.from({ length: half * half }, (_, i) => (
            <rect key={i} x={SX + XL + (i % half) * U} y={SY + XL + Math.floor(i / half) * U} width={U} height={U} fill={YELLOW} stroke={INK} />
          ))}
          {state.filled && (
            <>
              <line x1={SX} y1={SY - 12} x2={SX + XL + half * U} y2={SY - 12} stroke={ORANGE} strokeWidth={2} />
              <text x={SX + (XL + half * U) / 2} y={SY - 18} fontSize={15} fontWeight={700} textAnchor="middle" fill={ORANGE}>{`x + ${h}`}</text>
            </>
          )}
          {/* The tray: strips still to lay, and the c unit squares that stay as they are. */}
          <text x={tray.x} y={tray.y - 8} fontSize={14} fill={MUTED}>{w.tray}</text>
          {Array.from({ length: c }, (_, i) => (
            <rect key={i} x={tray.x + (i % 10) * (U - 4)} y={tray.y + 150 + Math.floor(i / 10) * (U - 4)} width={U - 6} height={U - 6} fill={YELLOW} stroke={INK} />
          ))}
          <text x={tray.x} y={tray.y + 140} fontSize={14} fill={MUTED}>{fill(w.units, { c })}</text>
        </g>
        {Array.from({ length: b - state.laid }, (_, i) => (
          <g key={i} role="button" tabIndex={i === 0 ? 0 : -1} aria-label={w.strip} onPointerDown={(e) => e.stopPropagation()} onClick={tap} onKeyDown={(e) => keyTap(e, tap)}
            style={{ cursor: "pointer" }}>
            <rect x={tray.x + i * (U + 6)} y={tray.y} width={U} height={XL * 0.8} fill={GREEN} fillOpacity={0.7} stroke={INK} />
          </g>
        ))}
        {all && !state.filled && (
          <rect x={SX + XL} y={SY + XL} width={half * U} height={half * U} fill="transparent" role="button" tabIndex={0} aria-label={w.corner}
            onPointerDown={(e) => e.stopPropagation()} onClick={tapCorner} onKeyDown={(e) => keyTap(e, tapCorner)} style={{ cursor: "pointer" }} />
        )}
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={16} fill={state.filled ? GREEN : INK} pointerEvents="none">{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
