// The pictures of an algorithm's steps, shared by the patterns and the interview problems: cells with pointers under
// them, rows of stacks and answers, a linked list, a binary tree, a coloured grid, intervals on a number line, a table
// and a graph. Each scene says how tall it is and draws itself at a given height; the height is the most any step needs,
// so nothing jumps as a trace plays.
import type { ReactNode } from "react";
import type { ArchBox, Cells, Frame, GraphEdge, Role, TreeNode } from "../math/patternSteps";
import { INK } from "./ui";

// The picture's width; its height is the most any step needs, so nothing jumps as it plays.
export const SW = 780;
export const ROLE: Record<Role, { fill: string; stroke: string; text: string }> = {
  plain: { fill: "#ffffff", stroke: "#868e96", text: INK },
  compare: { fill: "#ffe8cc", stroke: "#e8590c", text: INK },
  sorted: { fill: "#d3f9d8", stroke: "#2f9e44", text: INK },
  pivot: { fill: "#f3d9fa", stroke: "#9c36b5", text: INK },
  key: { fill: "#d0ebff", stroke: "#1971c2", text: INK },
  min: { fill: "#ffe3e3", stroke: "#e03131", text: INK },
  idle: { fill: "#f8f9fa", stroke: "#dee2e6", text: "#adb5bd" },
};
export const GRID_COLORS = ["#ffffff", "#a5d8ff", "#ffc9c9", "#b2f2bb", "#ffec99", "#d0bfff", "#ffd8a8", "#99e9f2", "#fcc2d7", "#ced4da"];
export const BLUE = "#1971c2";
export const GREY = "#868e96";
export const PURPLE = "#9c36b5";
export const MOVE = "transform 280ms ease-out";

export type Scene = { h: number; draw: (y: number) => ReactNode };

export const num = (v: number | string) => (typeof v === "number" && v < 0 ? `−${-v}` : String(v));
export const textW = (v: number | string) => num(v).length * 8.6;
export const roleOf = (roles: Role[] | undefined, i: number): Role => roles?.[i] ?? "plain";
/** Pointer names under their cells, stacked where two share one, sliding as they move. */
export function pointers(ptrs: Record<string, number> | undefined, xOf: (i: number) => number, y: number): ReactNode[] {
  const used = new Map<number, number>();
  return Object.entries(ptrs ?? {}).map(([name, i]) => {
    const k = used.get(i) ?? 0;
    used.set(i, k + 1);
    return (
      <g key={name} style={{ transform: `translate(${xOf(i)}px, ${y + k * 15}px)`, transition: MOVE }}>
        <text y={12} fontSize={13} fontWeight={700} fill={BLUE} textAnchor="middle">{k === 0 ? `↑${name}` : name}</text>
      </g>
    );
  });
}
export const stackOf = (ptrs: Record<string, number> | undefined) => {
  const at = Object.values(ptrs ?? {});
  return Math.max(0, ...at.map((i) => at.filter((j) => j === i).length));
};

export function box(key: string | number, x: number, y: number, w: number, h: number, text: number | string, role: Role, onClick?: () => void, size = 17) {
  const r = ROLE[role];
  return (
    <g key={key} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={5} fill={r.fill} stroke={r.stroke} strokeWidth={role === "plain" ? 1.2 : 2} style={{ transition: "fill 200ms, stroke 200ms" }} />
      <text x={x + w / 2} y={y + h / 2 + size * 0.36} fontSize={size} textAnchor="middle" fill={r.text}>{num(text)}</text>
    </g>
  );
}

export function ghost(key: string, x: number, y: number, w: number, h: number, onClick: () => void, title: string, round = false) {
  return (
    <g key={key} onClick={onClick} style={{ cursor: "pointer" }} aria-label={title}>
      <title>{title}</title>
      {round ? (
        <circle cx={x + w / 2} cy={y + h / 2} r={w / 2} fill="#fff" stroke="#adb5bd" strokeDasharray="4 3" />
      ) : (
        <rect x={x} y={y} width={w} height={h} rx={5} fill="#fff" stroke="#adb5bd" strokeDasharray="4 3" />
      )}
      <text x={x + w / 2} y={y + h / 2 + 6} fontSize={18} textAnchor="middle" fill="#adb5bd">+</text>
    </g>
  );
}

// ——— The main array ———

export function cellsScene(frames: Frame[], frame: Frame, edit: { at: (i: number, x: number, y: number, w: number, h: number) => void; add?: (x: number, y: number, w: number, h: number) => void; addTitle: string } | null): Scene {
  const c = frame.cells!;
  const n = c.vals.length;
  const slots = n + (edit?.add ? 1 : 0);
  const cw = Math.min(58, Math.floor((SW - 60) / slots));
  const bw = cw - 6;
  const x0 = (SW - slots * cw) / 2;
  const xOf = (i: number) => x0 + i * cw + cw / 2;
  const ranged = frames.some((f) => f.cells?.range);
  const stack = Math.max(0, ...frames.map((f) => stackOf(f.cells?.ptrs)));
  const CH = 46;
  return {
    h: 18 + CH + (ranged ? 10 : 0) + (stack ? 6 + stack * 15 : 0) + 6,
    draw: (y) => {
      const top = y + 18;
      const range = c.range;
      return (
        <g>
          {c.vals.map((_, i) => <text key={`i${i}`} x={xOf(i)} y={y + 12} fontSize={11} fill={GREY} textAnchor="middle">{i}</text>)}
          {c.vals.map((v, i) => box(i, xOf(i) - bw / 2, top, bw, CH, v, roleOf(c.roles, i), edit ? () => edit.at(i, xOf(i) - bw / 2, top, bw, CH) : undefined))}
          {edit?.add && ghost("add", xOf(n) - bw / 2, top, bw, CH, () => edit.add!(xOf(n) - bw / 2, top, bw, CH), edit.addTitle)}
          {range && (
            <path
              d={`M${xOf(range[0]) - bw / 2},${top + CH + 3} v5 H${xOf(range[1]) + bw / 2} v-5`}
              fill="none"
              stroke={PURPLE}
              strokeWidth={2}
            />
          )}
          {pointers(c.ptrs, xOf, top + CH + (ranged ? 10 : 2))}
        </g>
      );
    },
  };
}

// ——— Rows under the picture: stacks, heaps, queues, answers ———

export const ROW_X = 116;
/** Where the rows' boxes start: after the longest label any step has (at least ROW_X), so no label runs off the edge. */
const rowStart = (frames: Frame[]) => Math.min(260, Math.max(ROW_X, ...frames.flatMap((f) => (f.rows ?? []).map((r) => (r.label ? textW(r.label) * 0.86 + 20 : 0)))));

export function rowLayout(c: Cells, x0 = ROW_X) {
  const items: { x: number; y: number; w: number }[] = [];
  let [x, y] = [x0, 0];
  for (const v of c.vals) {
    const w = Math.max(34, textW(v) + 16);
    if (x + w > SW - 8 && x > x0) [x, y] = [x0, y + 36];
    items.push({ x, y, w });
    x += w + 5;
  }
  return { items, h: Math.max(30, y + 30) };
}

export function rowsScene(frames: Frame[], frame: Frame): Scene {
  const rows = frame.rows ?? [];
  const most = Math.max(0, ...frames.map((f) => f.rows?.length ?? 0));
  const x0 = rowStart(frames);
  // Each row as tall as it gets at any step.
  const heights = Array.from({ length: most }, (_, r) => Math.max(30, ...frames.map((f) => (f.rows?.[r] ? rowLayout(f.rows[r], x0).h : 0))));
  const indexed = frames.some((f) => f.rows?.some((row) => row.label === "P"));
  const gap = indexed ? 22 : 10;
  return {
    h: heights.reduce((a, b) => a + b + gap, 0),
    draw: (y0) => {
      let y = y0 + (indexed ? 12 : 0);
      return rows.map((row, r) => {
        const { items } = rowLayout(row, x0);
        const at = y;
        y += heights[r] + gap;
        return (
          <g key={r}>
            <text x={x0 - 10} y={at + 20} fontSize={14} fill={GREY} textAnchor="end">{row.label}</text>
            {row.label === "P" && items.map((it, i) => <text key={`i${i}`} x={it.x + it.w / 2} y={at - 3} fontSize={10} fill={GREY} textAnchor="middle">{i}</text>)}
            {items.map((it, i) => box(i, it.x, at + it.y, it.w, 30, row.vals[i], roleOf(row.roles, i), undefined, 15))}
          </g>
        );
      });
    },
  };
}

// ——— A linked list ———

export function listScene(frames: Frame[], frame: Frame, edit: { at: (i: number, x: number, y: number, w: number, h: number) => void; add?: (x: number, y: number, w: number, h: number) => void; addTitle: string } | null): Scene {
  const l = frame.list!;
  const n = l.vals.length;
  const slots = n + (edit?.add ? 1 : 0);
  const sp = Math.min(76, Math.floor((SW - 60) / slots));
  const bw = Math.min(46, sp - 24);
  const x0 = (SW - slots * sp) / 2;
  const xOf = (i: number) => x0 + i * sp + sp / 2;
  const stack = Math.max(0, ...frames.map((f) => stackOf(f.list?.ptrs)));
  // Links forward over the top, links back underneath (higher or lower the further they reach), so they don't cross.
  const back = frames.some((f) => f.list?.next.some((j, i) => j >= 0 && j < i));
  const ARC = 46;
  const BH = 36;
  const DOWN = back ? 40 : 6;
  return {
    h: ARC + BH + DOWN + stack * 15 + 6,
    draw: (y) => {
      const top = y + ARC;
      const mid = top + BH / 2;
      const bottom = top + BH;
      const arrows = l.next.map((j, i) => {
        if (j < 0) return <text key={`a${i}`} x={xOf(i) + bw / 2 + 5} y={mid + 5} fontSize={13} fill={GREY}>∅</text>;
        if (j === i + 1)
          return <line key={`a${i}`} x1={xOf(i) + bw / 2} y1={mid} x2={xOf(j) - bw / 2 - 2} y2={mid} stroke={INK} strokeWidth={1.6} markerEnd="url(#pat-arrow)" />;
        const reach = Math.min(ARC - 6, 14 + 9 * Math.abs(j - i));
        if (j > i) {
          const [x1, x2] = [xOf(i) + 6, xOf(j) - 6];
          return <path key={`a${i}`} d={`M${x1},${top} C${x1},${top - reach} ${x2},${top - reach} ${x2},${top - 2}`} fill="none" stroke={INK} strokeWidth={1.6} markerEnd="url(#pat-arrow)" />;
        }
        const [x1, x2] = [xOf(i) - 6, xOf(j) + 6];
        return <path key={`a${i}`} d={`M${x1},${bottom} C${x1},${bottom + reach - 6} ${x2},${bottom + reach - 6} ${x2},${bottom + 2}`} fill="none" stroke={PURPLE} strokeWidth={1.6} markerEnd="url(#pat-arrow-back)" />;
      });
      return (
        <g>
          {arrows}
          {l.vals.map((v, i) => box(i, xOf(i) - bw / 2, top, bw, BH, v, l.roles[i], edit ? () => edit.at(i, xOf(i) - bw / 2, top, bw, BH) : undefined))}
          {edit?.add && ghost("add", xOf(n) - bw / 2, top, bw, BH, () => edit.add!(xOf(n) - bw / 2, top, bw, BH), edit.addTitle)}
          {pointers(l.ptrs, xOf, bottom + DOWN - 2)}
        </g>
      );
    },
  };
}

// ——— A binary tree ———

export type Spot = { node: number; parent: number; side: "left" | "right"; x: number; depth: number };

/** Nodes (and, when it can grow, the empty places for children) spread out in order, a level to a row. */
export function treeLayout(nodes: TreeNode[], grow: boolean) {
  const spots: Spot[] = [];
  const walk = (at: number, parent: number, side: "left" | "right", depth: number) => {
    if (at < 0) {
      if (grow && depth < 4) spots.push({ node: -1, parent, side, x: 0, depth });
      return;
    }
    walk(nodes[at].left, at, "left", depth + 1);
    spots.push({ node: at, parent, side, x: 0, depth });
    walk(nodes[at].right, at, "right", depth + 1);
  };
  walk(0, -1, "left", 0);
  const sp = Math.min(64, (SW - 40) / spots.length);
  const x0 = (SW - spots.length * sp) / 2 + sp / 2;
  spots.forEach((s, i) => (s.x = x0 + i * sp));
  return { spots, levels: 1 + Math.max(...spots.map((s) => s.depth)) };
}

/** A tree; with `edit` its nodes can be clicked, and with `add` (when it may grow) its empty places too. */
export function treeScene(nodes: TreeNode[], frame: Frame, grow: boolean, edit: ((node: number, x: number, y: number) => void) | null, add: ((s: Spot, x: number, y: number) => void) | null, addTitle: string, levelsAtMost?: number): Scene {
  const { spots, levels: own } = treeLayout(nodes, grow && !!add);
  const levels = Math.max(own, levelsAtMost ?? 0);
  const LV = 58;
  const R = 18;
  const tags = frame.tree?.tags;
  const where = new Map(spots.filter((s) => s.node >= 0).map((s) => [s.node, s]));
  return {
    h: 8 + (levels - 1) * LV + 2 * R + 6 + (tags ? 12 : 0),
    draw: (y) => {
      const yOf = (d: number) => y + 8 + R + d * LV;
      return (
        <g>
          {spots.map((s, i) => {
            const p = s.parent >= 0 ? where.get(s.parent)! : null;
            return p && <line key={`e${i}`} x1={p.x} y1={yOf(p.depth)} x2={s.x} y2={yOf(s.depth)} stroke={s.node < 0 ? "#dee2e6" : "#adb5bd"} strokeWidth={1.5} strokeDasharray={s.node < 0 ? "4 3" : undefined} />;
          })}
          {spots.map((s, i) => {
            if (s.node < 0) return add && ghost(`g${i}`, s.x - 11, yOf(s.depth) - 11, 22, 22, () => add(s, s.x - R, yOf(s.depth) - 14), addTitle, true);
            const r = ROLE[frame.tree?.roles[s.node] ?? "plain"];
            return (
              <g key={`n${s.node}`} onClick={edit ? () => edit(s.node, s.x - R, yOf(s.depth) - 14) : undefined} style={edit ? { cursor: "pointer" } : undefined}>
                <circle cx={s.x} cy={yOf(s.depth)} r={R} fill={r.fill} stroke={r.stroke} strokeWidth={2} style={{ transition: "fill 200ms, stroke 200ms" }} />
                <text x={s.x} y={yOf(s.depth) + 6} fontSize={16} textAnchor="middle" fill={r.text}>{frame.tree?.labels?.[s.node] ?? num(nodes[s.node].val)}</text>
                {tags?.[s.node] && <text x={s.x} y={yOf(s.depth) + R + 12} fontSize={11} fontWeight={700} textAnchor="middle" fill={PURPLE}>{tags[s.node]}</text>}
              </g>
            );
          })}
        </g>
      );
    },
  };
}

// ——— A grid ———

export function gridScene(frame: Frame, start: [number, number] | null, click: ((r: number, c: number) => void) | null): Scene {
  const g = frame.grid!;
  const R = g.vals.length;
  const C = g.vals[0].length;
  const cs = Math.min(50, Math.floor(300 / Math.max(R, C)));
  const x0 = (SW - C * cs) / 2;
  return {
    h: 16 + R * cs + 4,
    draw: (y) => (
      <g>
        {g.vals[0].map((_, c) => <text key={`c${c}`} x={x0 + c * cs + cs / 2} y={y + 11} fontSize={11} fill={GREY} textAnchor="middle">{c}</text>)}
        {g.vals.map((row, r) => (
          <g key={r}>
            <text x={x0 - 8} y={y + 16 + r * cs + cs / 2 + 4} fontSize={11} fill={GREY} textAnchor="end">{r}</text>
            {row.map((v, c) => {
              const role = g.roles[r][c];
              const [x, yy] = [x0 + c * cs, y + 16 + r * cs];
              return (
                <g key={c} onClick={click ? () => click(r, c) : undefined} style={click ? { cursor: "pointer" } : undefined}>
                  <rect x={x} y={yy} width={cs} height={cs} fill={GRID_COLORS[v] ?? "#fff"} stroke="#adb5bd" style={{ transition: "fill 250ms" }} />
                  {(role === "key" || role === "compare") && (
                    <rect x={x + 3} y={yy + 3} width={cs - 6} height={cs - 6} fill="none" stroke={ROLE[role].stroke} strokeWidth={3} strokeDasharray={role === "compare" ? "5 3" : undefined} />
                  )}
                  <text x={x + cs / 2} y={yy + cs / 2 + 6} fontSize={16} textAnchor="middle" fill={INK}>{v}</text>
                  {start && start[0] === r && start[1] === c && <text x={x + 4} y={yy + 13} fontSize={12} fill={BLUE}>⌖</text>}
                </g>
              );
            })}
          </g>
        ))}
      </g>
    ),
  };
}

// ——— Intervals on a number line ———

export function spansScene(frames: Frame[], frame: Frame): Scene {
  const all = frames.flatMap((f) => f.spans ?? []).flatMap((s) => s.items);
  const lo = Math.min(...all.map((s) => s[0]));
  const hi = Math.max(lo + 1, ...all.map((s) => s[1]));
  const [x0, x1] = [ROW_X, SW - 70];
  const xOf = (v: number) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((s) => (hi - lo) / s <= 20) ?? 1000;
  const lanes = (frames[0].spans ?? []).map((_, k) => Math.max(1, ...frames.map((f) => (k === 0 ? f.spans?.[k]?.items.length ?? 0 : 1))));
  const LANE = 22;
  const rowsH = lanes.map((n) => n * LANE + 12);
  return {
    h: rowsH.reduce((a, b) => a + b, 0) + 26,
    draw: (y0) => {
      let y = y0;
      const rows = (frame.spans ?? []).map((s, k) => {
        const at = y;
        y += rowsH[k];
        return (
          <g key={k}>
            <text x={ROW_X - 10} y={at + 16} fontSize={14} fill={GREY} textAnchor="end">{s.label}</text>
            {s.items.map(([a, b], i) => {
              const r = ROLE[s.roles[i] ?? "plain"];
              const yy = at + (k === 0 ? i : 0) * LANE + 4;
              return (
                <g key={i}>
                  <rect x={xOf(a)} y={yy} width={Math.max(4, xOf(b) - xOf(a))} height={LANE - 6} rx={4} fill={r.fill} stroke={r.stroke} strokeWidth={1.6} style={{ transition: "fill 200ms, width 280ms" }} />
                  <text x={xOf(b) + 5} y={yy + 12} fontSize={11} fill={GREY}>{a === b ? num(a) : `[${num(a)}, ${num(b)}]`}</text>
                </g>
              );
            })}
          </g>
        );
      });
      const ticks = [];
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step)
        ticks.push(
          <g key={v}>
            <line x1={xOf(v)} y1={y + 2} x2={xOf(v)} y2={y + 7} stroke={GREY} />
            <text x={xOf(v)} y={y + 20} fontSize={11} fill={GREY} textAnchor="middle">{num(v)}</text>
          </g>,
        );
      return (
        <g>
          {rows}
          <line x1={x0} y1={y + 2} x2={x1} y2={y + 2} stroke={GREY} />
          {ticks}
        </g>
      );
    },
  };
}


// ——— A table: a matrix, a board or a DP table ———

export function matScene(frames: Frame[], frame: Frame): Scene {
  const m = frame.mat!;
  const mats = frames.flatMap((f) => (f.mat ? [f.mat] : []));
  const R = Math.max(...mats.map((t) => t.vals.length));
  const C = Math.max(...mats.map((t) => Math.max(0, ...t.vals.map((r) => r.length))));
  const heads = mats.some((t) => t.rowHeads);
  const colHeads = mats.some((t) => t.colHeads);
  const headW = heads ? Math.max(28, ...mats.flatMap((t) => t.rowHeads ?? []).map((h) => textW(h) * 0.72 + 12)) : 22;
  const cs = Math.min(46, Math.floor((SW - 40 - headW) / Math.max(1, C)), Math.floor(380 / Math.max(1, R)));
  const size = Math.min(16, 7 + cs * 0.22);
  // A column is as wide as its longest entry (in any step) needs, and at least a square.
  const widths = Array.from({ length: C }, (_, c) =>
    Math.max(cs, ...mats.flatMap((t) => t.vals.map((r) => (r[c] === undefined ? 0 : textW(r[c]) * (size / 17) + 14))), ...(colHeads ? mats.map((t) => textW(t.colHeads?.[c] ?? "") * 0.66 + 10) : [])),
  );
  const xs = widths.reduce((acc, wd) => [...acc, acc[acc.length - 1] + wd], [0]);
  const x0 = (SW - headW - xs[C]) / 2 + headW;
  return {
    h: 16 + R * cs + 4,
    draw: (y) => (
      <g>
        {Array.from({ length: C }, (_, c) => (
          <text key={`c${c}`} x={x0 + xs[c] + widths[c] / 2} y={y + 11} fontSize={11} fill={colHeads ? BLUE : GREY} fontWeight={colHeads ? 700 : 400} textAnchor="middle">{m.colHeads?.[c] ?? c}</text>
        ))}
        {m.vals.map((r, i) => (
          <g key={i}>
            <text x={x0 - 8} y={y + 16 + i * cs + cs / 2 + 4} fontSize={11} fill={heads ? BLUE : GREY} fontWeight={heads ? 700 : 400} textAnchor="end">{m.rowHeads?.[i] ?? i}</text>
            {r.map((v, c) => box(`${i}:${c}`, x0 + xs[c] + 1, y + 16 + i * cs + 1, widths[c] - 2, cs - 2, v, m.roles[i]?.[c] ?? "plain", undefined, size))}
          </g>
        ))}
      </g>
    ),
  };
}

// ——— A graph ———

/** Where each node sits: in layers (a tree from its root, a row per layer) or round a circle. */
/**
 * Angles in degrees pushed apart until no two nodes overlap, keeping their order round the circle (ties in index
 * order): only next-door neighbours push each other, half each way, so every node stays near where it was.
 */
function spread(angle: number[]): number[] {
  const n = angle.length;
  const gap = Math.min(22, (360 / n) * 0.95);
  const order = angle.map((x, i) => [((x % 360) + 360) % 360, i] as const).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const b = order.map(([x]) => x);
  for (let round = 0; round < 500; round++) {
    let moved = false;
    for (let k = 0; k < n; k++) {
      const next = (k + 1) % n;
      const d = b[next] + (next === 0 ? 360 : 0) - b[k];
      if (n < 2 || d >= gap - 1e-6) continue;
      b[k] -= (gap - d) / 2;
      b[next] += (gap - d) / 2;
      moved = true;
    }
    if (!moved) break;
  }
  const out: number[] = Array(n);
  order.forEach(([, i], k) => (out[i] = b[k]));
  return out;
}

function graphLayout(n: number, layer: number[] | undefined, edges: GraphEdge[], w: number, h: number, angle?: number[]): [number, number][] {
  if (!layer) {
    const r = Math.min(w, h) / 2 - 26;
    const deg = angle ? spread(angle) : Array.from({ length: n }, (_, i) => (360 * i) / n);
    return deg.map((d) => [w / 2 + r * Math.sin((Math.PI * d) / 180), h / 2 - r * Math.cos((Math.PI * d) / 180)]);
  }
  const rows = 1 + Math.max(0, ...layer);
  const yOf = (d: number) => 26 + (rows === 1 ? 0 : (d * (h - 52)) / (rows - 1));
  // A forest (every node below the top joined to exactly one node a layer up): the leaves take the next places left to
  // right and each parent sits over the middle of its children, so no two edges cross.
  const parent = Array.from({ length: n }, (_, i) => {
    if (layer[i] === 0) return -1;
    const up = new Set(edges.flatMap((e) => (e.a === i && layer[e.b] === layer[i] - 1 ? [e.b] : e.b === i && layer[e.a] === layer[i] - 1 ? [e.a] : [])));
    return up.size === 1 ? [...up][0] : -2;
  });
  if (!parent.includes(-2)) {
    const kids = Array.from({ length: n }, (_, v) => parent.flatMap((p, i) => (p === v ? [i] : [])));
    const x: number[] = Array(n).fill(0);
    let slot = 0;
    const place = (v: number) => {
      if (!kids[v].length) return void (x[v] = slot++);
      kids[v].forEach(place);
      x[v] = (x[kids[v][0]] + x[kids[v][kids[v].length - 1]]) / 2;
    };
    layer.forEach((d, i) => d === 0 && place(i));
    return x.map((v, i) => [((v + 0.5) * w) / slot, yOf(layer[i])]);
  }
  const pos: [number, number][] = [];
  for (let d = 0; d < rows; d++) {
    const here = layer.flatMap((l, i) => (l === d ? [i] : []));
    here.forEach((i, k) => (pos[i] = [((k + 0.5) * w) / here.length, yOf(d)]));
  }
  return pos;
}

export function graphScene(frames: Frame[], frame: Frame): Scene {
  const g = frame.graph!;
  const n = g.nodes.length;
  const rows = g.layer ? 1 + Math.max(0, ...frames.map((f) => Math.max(0, ...(f.graph?.layer ?? [0])))) : 0;
  const tags = frames.some((f) => f.graph?.tags);
  const H = g.layer ? Math.max(60, rows * 64) : n <= 4 ? 220 : 300;
  const R = Math.max(13, Math.min(19, 260 / Math.max(1, n)));
  const W = g.layer ? SW - 40 : Math.min(SW - 40, H + 160);
  const x0 = (SW - W) / 2;
  const pos = graphLayout(n, g.layer, g.edges, W, H, g.angle).map(([x, yy]) => [x0 + x, yy] as [number, number]);
  return {
    h: H + (tags ? 14 : 0),
    draw: (y) => (
      <g>
        {g.angle && <circle cx={x0 + W / 2} cy={y + H / 2} r={Math.min(W, H) / 2 - 26} fill="none" stroke="#dee2e6" strokeWidth={2} />}
        {g.edges.map((e, i) => {
          const [ax, ay] = pos[e.a];
          const [bx, by] = pos[e.b];
          const d = Math.hypot(bx - ax, by - ay) || 1;
          const [ux, uy] = [(bx - ax) / d, (by - ay) / d];
          const role = e.role ?? "plain";
          const hot = role !== "plain";
          // Both ways between the same two nodes: bend each a little so they don't lie on top of each other.
          const twin = g.directed && g.edges.some((f) => f.a === e.b && f.b === e.a);
          const bend = twin ? 14 : 0;
          const [mx, my] = [(ax + bx) / 2 - uy * bend, (ay + by) / 2 + ux * bend];
          const [sx, sy, tx, ty] = [ax + ux * R, ay + uy * R, bx - ux * (R + 2), by - uy * (R + 2)];
          return (
            <g key={`e${i}`}>
              <path
                d={`M${sx},${y + sy} Q${2 * mx - (sx + tx) / 2},${y + 2 * my - (sy + ty) / 2} ${tx},${y + ty}`}
                fill="none"
                stroke={hot ? ROLE[role].stroke : "#adb5bd"}
                strokeWidth={hot ? 3 : 1.6}
                strokeDasharray={role === "idle" ? "4 3" : undefined}
                markerEnd={g.directed ? "url(#pat-arrow)" : undefined}
                style={{ transition: "stroke 200ms" }}
              />
              {e.w !== undefined && (
                <text x={mx - uy * 9} y={y + my + ux * 9 + 4} fontSize={12} fontWeight={700} textAnchor="middle" fill={hot ? ROLE[role].stroke : GREY}>{e.w}</text>
              )}
            </g>
          );
        })}
        {g.nodes.map((label, i) => {
          const [x, yy] = pos[i];
          const r = ROLE[g.roles[i] ?? "plain"];
          return (
            <g key={`n${i}`}>
              <circle cx={x} cy={y + yy} r={R} fill={r.fill} stroke={r.stroke} strokeWidth={2} style={{ transition: "fill 200ms, stroke 200ms" }} />
              <text x={x} y={y + yy + 5} fontSize={Math.min(15, R * 0.85)} textAnchor="middle" fill={r.text}>{label}</text>
              {g.tags?.[i] && <text x={x} y={y + yy + R + 12} fontSize={11} fontWeight={700} textAnchor="middle" fill={PURPLE}>{g.tags[i]}</text>}
            </g>
          );
        })}
      </g>
    ),
  };
}

// ——— A system's architecture ———

const ARCH_ROW = 76;
const ARCH_H = 40;
const archW = (b: ArchBox) => Math.max(84, Math.min(170, b.label.length * 7.4 + 22));

/** One box: a cylinder for a database or a blob store, stripes for a queue, round ends for a client. */
function archBox(key: number, b: ArchBox, cx: number, cy: number) {
  const r = ROLE[b.role ?? "plain"];
  const w = archW(b);
  const [x, y] = [cx - w / 2, cy - ARCH_H / 2];
  const stroke = { stroke: r.stroke, strokeWidth: b.role && b.role !== "plain" ? 2.2 : 1.4, style: { transition: "fill 200ms, stroke 200ms" } };
  let shape: ReactNode;
  if (b.kind === "db" || b.kind === "store")
    shape = (
      <g>
        <path d={`M${x},${y + 6} v${ARCH_H - 12} a${w / 2},6 0 0 0 ${w},0 v${-(ARCH_H - 12)}`} fill={r.fill} {...stroke} />
        <ellipse cx={cx} cy={y + 6} rx={w / 2} ry={6} fill={r.fill} {...stroke} />
      </g>
    );
  else if (b.kind === "queue")
    shape = (
      <g>
        <rect x={x} y={y} width={w} height={ARCH_H} rx={3} fill={r.fill} {...stroke} />
        {[1, 2, 3].map((k) => <line key={k} x1={x + w - k * 9} y1={y + 3} x2={x + w - k * 9} y2={y + ARCH_H - 3} stroke={r.stroke} strokeWidth={1} />)}
      </g>
    );
  else shape = <rect x={x} y={y} width={w} height={ARCH_H} rx={b.kind === "client" ? ARCH_H / 2 : b.kind === "lb" || b.kind === "cdn" ? 12 : 5} fill={r.fill} {...stroke} strokeDasharray={b.kind === "cache" ? "5 3" : undefined} />;
  return (
    <g key={key}>
      {shape}
      <text x={cx} y={cy + 5 + (b.kind === "db" || b.kind === "store" ? 3 : 0)} fontSize={Math.min(13, (w - 12) / (b.label.length * 0.57))} textAnchor="middle" fill={r.text}>{b.label}</text>
      {b.tag && <text x={cx} y={cy + ARCH_H / 2 + 13} fontSize={11} fontWeight={700} textAnchor="middle" fill={PURPLE}>{b.tag}</text>}
    </g>
  );
}

export function archScene(frames: Frame[], frame: Frame): Scene {
  const a = frame.arch!;
  const all = frames.flatMap((f) => f.arch?.boxes ?? []);
  const cols = 1 + Math.max(0, ...all.map((b) => b.col));
  const rows = 1 + Math.max(0, ...all.map((b) => b.row));
  const colW = (SW - 20) / cols;
  const at = (b: ArchBox): [number, number] => [10 + (b.col + 0.5) * colW, 26 + b.row * ARCH_ROW];
  /** Where the line from a box's centre towards (tx, ty) leaves the box. */
  const edge = (b: ArchBox, tx: number, ty: number): [number, number] => {
    const [cx, cy] = at(b);
    const [dx, dy] = [tx - cx, ty - cy];
    const [hw, hh] = [archW(b) / 2 + 3, ARCH_H / 2 + 3];
    const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return [cx + dx * t, cy + dy * t];
  };
  return {
    h: 26 + (rows - 1) * ARCH_ROW + ARCH_H / 2 + 18,
    draw: (y) => (
      <g>
        {a.links.map((l, i) => {
          const [A, B] = [a.boxes[l.a], a.boxes[l.b]];
          const [bx, by] = at(B);
          const [ax, ay] = at(A);
          const [x1, y1] = edge(A, bx, by);
          const [x2, y2] = edge(B, ax, ay);
          const role = l.role ?? "plain";
          const hot = role !== "plain";
          const color = hot ? ROLE[role].stroke : GREY;
          return (
            <g key={`l${i}`}>
              <line
                x1={x1}
                y1={y + y1}
                x2={x2}
                y2={y + y2}
                stroke={color}
                strokeWidth={hot ? 2.6 : 1.4}
                strokeDasharray={l.dashed ? "6 4" : undefined}
                markerEnd={hot ? "url(#pat-arrow-hot)" : "url(#pat-arrow-grey)"}
                markerStart={l.both ? (hot ? "url(#pat-arrow-hot)" : "url(#pat-arrow-grey)") : undefined}
                style={{ transition: "stroke 200ms" }}
              />
              {l.label && (
                <text x={(x1 + x2) / 2} y={y + (y1 + y2) / 2 - 5} fontSize={11} fontWeight={hot ? 700 : 400} textAnchor="middle" fill={color} paintOrder="stroke" stroke="#fff" strokeWidth={4}>{l.label}</text>
              )}
            </g>
          );
        })}
        {a.boxes.map((b, i) => {
          const [cx, cy] = at(b);
          return archBox(i, b, cx, y + cy);
        })}
      </g>
    ),
  };
}

/** The arrowheads the list and graph scenes point with. */
export function Markers() {
  return (
    <defs>
      <marker id="pat-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={INK} />
      </marker>
      <marker id="pat-arrow-back" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={PURPLE} />
      </marker>
      <marker id="pat-arrow-grey" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={GREY} />
      </marker>
      <marker id="pat-arrow-hot" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={ROLE.compare.stroke} />
      </marker>
    </defs>
  );
}
