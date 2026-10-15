// The algorithm patterns on the board: pick one of the fifteen, change its numbers, tree or grid by clicking them, and
// step through it, play it, or (with "Your turn") say what happens before each move. The frames come from
// patternSteps.ts; this file only draws them: cells with pointers under them, a linked list, a tree, a grid, intervals
// on a number line, and the stacks, queues and answers that go with them.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LivePatterns } from "../math/live";
import {
  MAX_CELLS, MAX_DP, MAX_GRID, MAX_TREE, PATTERN_DATA, PATTERN_EXAMPLES, PATTERN_IDS, PERMUTE_MAX, parseGrid, parseList,
  patternTrace, TRAVERSALS, writeGrid, writeTree, type Cells, type Frame, type PatternId, type Role, type Trace, type TreeNode,
} from "../math/patternSteps";
import { fill, FONT, INK, Stepper, Toggle, type PieceProps } from "./ui";

// The picture's width; its height is the most any step needs, so nothing jumps as it plays.
const SW = 780;
const ROLE: Record<Role, { fill: string; stroke: string; text: string }> = {
  plain: { fill: "#ffffff", stroke: "#868e96", text: INK },
  compare: { fill: "#ffe8cc", stroke: "#e8590c", text: INK },
  sorted: { fill: "#d3f9d8", stroke: "#2f9e44", text: INK },
  pivot: { fill: "#f3d9fa", stroke: "#9c36b5", text: INK },
  key: { fill: "#d0ebff", stroke: "#1971c2", text: INK },
  min: { fill: "#ffe3e3", stroke: "#e03131", text: INK },
  idle: { fill: "#f8f9fa", stroke: "#dee2e6", text: "#adb5bd" },
};
const GRID_COLORS = ["#ffffff", "#a5d8ff", "#ffc9c9", "#b2f2bb", "#ffec99", "#d0bfff", "#ffd8a8", "#99e9f2", "#fcc2d7", "#ced4da"];
const BLUE = "#1971c2";
const GREY = "#868e96";
const PURPLE = "#9c36b5";
const MOVE = "transform 280ms ease-out";
const PLAY_MS = 1100;

/** A box on the picture to type into, and what to do with what is typed. */
type Edit = { x: number; y: number; w: number; h: number; value: string; commit: (v: string) => void };
type Scene = { h: number; draw: (y: number) => ReactNode };

const num = (v: number | string) => (typeof v === "number" && v < 0 ? `−${-v}` : String(v));
const textW = (v: number | string) => num(v).length * 8.6;
const roleOf = (roles: Role[] | undefined, i: number): Role => roles?.[i] ?? "plain";
/** A number typed into a box: empty means "remove it", and anything else that isn't a number is ignored. */
const typed = (v: string): number | null | undefined => {
  const t = v.trim().replace(/[−–]/g, "-");
  if (!t) return null;
  const x = Number(t);
  return Number.isFinite(x) ? x : undefined;
};

/** Pointer names under their cells, stacked where two share one, sliding as they move. */
function pointers(ptrs: Record<string, number> | undefined, xOf: (i: number) => number, y: number): ReactNode[] {
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
const stackOf = (ptrs: Record<string, number> | undefined) => {
  const at = Object.values(ptrs ?? {});
  return Math.max(0, ...at.map((i) => at.filter((j) => j === i).length));
};

function box(key: string | number, x: number, y: number, w: number, h: number, text: number | string, role: Role, onClick?: () => void, size = 17) {
  const r = ROLE[role];
  return (
    <g key={key} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={5} fill={r.fill} stroke={r.stroke} strokeWidth={role === "plain" ? 1.2 : 2} style={{ transition: "fill 200ms, stroke 200ms" }} />
      <text x={x + w / 2} y={y + h / 2 + size * 0.36} fontSize={size} textAnchor="middle" fill={r.text}>{num(text)}</text>
    </g>
  );
}

function ghost(key: string, x: number, y: number, w: number, h: number, onClick: () => void, title: string, round = false) {
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

function cellsScene(frames: Frame[], frame: Frame, edit: { at: (i: number, x: number, y: number, w: number, h: number) => void; add?: (x: number, y: number, w: number, h: number) => void; addTitle: string } | null): Scene {
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

const ROW_X = 116;
function rowLayout(c: Cells) {
  const items: { x: number; y: number; w: number }[] = [];
  let [x, y] = [ROW_X, 0];
  for (const v of c.vals) {
    const w = Math.max(34, textW(v) + 16);
    if (x + w > SW - 8 && x > ROW_X) [x, y] = [ROW_X, y + 36];
    items.push({ x, y, w });
    x += w + 5;
  }
  return { items, h: Math.max(30, y + 30) };
}

function rowsScene(frames: Frame[], frame: Frame): Scene {
  const rows = frame.rows ?? [];
  const most = Math.max(0, ...frames.map((f) => f.rows?.length ?? 0));
  // Each row as tall as it gets at any step.
  const heights = Array.from({ length: most }, (_, r) => Math.max(30, ...frames.map((f) => (f.rows?.[r] ? rowLayout(f.rows[r]).h : 0))));
  const indexed = frames.some((f) => f.rows?.some((row) => row.label === "P"));
  const gap = indexed ? 22 : 10;
  return {
    h: heights.reduce((a, b) => a + b + gap, 0),
    draw: (y0) => {
      let y = y0 + (indexed ? 12 : 0);
      return rows.map((row, r) => {
        const { items } = rowLayout(row);
        const at = y;
        y += heights[r] + gap;
        return (
          <g key={r}>
            <text x={ROW_X - 10} y={at + 20} fontSize={14} fill={GREY} textAnchor="end">{row.label}</text>
            {row.label === "P" && items.map((it, i) => <text key={`i${i}`} x={it.x + it.w / 2} y={at - 3} fontSize={10} fill={GREY} textAnchor="middle">{i}</text>)}
            {items.map((it, i) => box(i, it.x, at + it.y, it.w, 30, row.vals[i], roleOf(row.roles, i), undefined, 15))}
          </g>
        );
      });
    },
  };
}

// ——— A linked list ———

function listScene(frames: Frame[], frame: Frame, edit: { at: (i: number, x: number, y: number, w: number, h: number) => void; add?: (x: number, y: number, w: number, h: number) => void; addTitle: string }): Scene {
  const l = frame.list!;
  const n = l.vals.length;
  const slots = n + (edit.add ? 1 : 0);
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
          {l.vals.map((v, i) => box(i, xOf(i) - bw / 2, top, bw, BH, v, l.roles[i], () => edit.at(i, xOf(i) - bw / 2, top, bw, BH)))}
          {edit.add && ghost("add", xOf(n) - bw / 2, top, bw, BH, () => edit.add!(xOf(n) - bw / 2, top, bw, BH), edit.addTitle)}
          {pointers(l.ptrs, xOf, bottom + DOWN - 2)}
        </g>
      );
    },
  };
}

// ——— A binary tree ———

type Spot = { node: number; parent: number; side: "left" | "right"; x: number; depth: number };

/** Nodes (and, when it can grow, the empty places for children) spread out in order, a level to a row. */
function treeLayout(nodes: TreeNode[], grow: boolean) {
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

function treeScene(nodes: TreeNode[], frame: Frame, grow: boolean, edit: (node: number, x: number, y: number) => void, add: (s: Spot, x: number, y: number) => void, addTitle: string): Scene {
  const { spots, levels } = treeLayout(nodes, grow);
  const LV = 58;
  const R = 18;
  const where = new Map(spots.filter((s) => s.node >= 0).map((s) => [s.node, s]));
  return {
    h: 8 + (levels - 1) * LV + 2 * R + 6,
    draw: (y) => {
      const yOf = (d: number) => y + 8 + R + d * LV;
      return (
        <g>
          {spots.map((s, i) => {
            const p = s.parent >= 0 ? where.get(s.parent)! : null;
            return p && <line key={`e${i}`} x1={p.x} y1={yOf(p.depth)} x2={s.x} y2={yOf(s.depth)} stroke={s.node < 0 ? "#dee2e6" : "#adb5bd"} strokeWidth={1.5} strokeDasharray={s.node < 0 ? "4 3" : undefined} />;
          })}
          {spots.map((s, i) => {
            if (s.node < 0) return ghost(`g${i}`, s.x - 11, yOf(s.depth) - 11, 22, 22, () => add(s, s.x - R, yOf(s.depth) - 14), addTitle, true);
            const r = ROLE[frame.tree?.roles[s.node] ?? "plain"];
            return (
              <g key={`n${s.node}`} onClick={() => edit(s.node, s.x - R, yOf(s.depth) - 14)} style={{ cursor: "pointer" }}>
                <circle cx={s.x} cy={yOf(s.depth)} r={R} fill={r.fill} stroke={r.stroke} strokeWidth={2} style={{ transition: "fill 200ms, stroke 200ms" }} />
                <text x={s.x} y={yOf(s.depth) + 6} fontSize={16} textAnchor="middle" fill={r.text}>{num(nodes[s.node].val)}</text>
              </g>
            );
          })}
        </g>
      );
    },
  };
}

// ——— A grid ———

function gridScene(frame: Frame, start: [number, number] | null, click: (r: number, c: number) => void): Scene {
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
                <g key={c} onClick={() => click(r, c)} style={{ cursor: "pointer" }}>
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

function spansScene(frames: Frame[], frame: Frame): Scene {
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
                  <text x={xOf(b) + 5} y={yy + 12} fontSize={11} fill={GREY}>{`[${num(a)}, ${num(b)}]`}</text>
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

// ——— The piece ———

export function Patterns({ state, set, w: words, svgRef }: PieceProps<"patterns">) {
  const w = words.patterns;
  const { pattern, data, extra, quiz } = state;
  const kind = PATTERN_DATA[pattern];
  const result = useMemo((): { trace: Trace } | { error: string } => {
    try {
      return { trace: patternTrace(pattern, { data, extra }, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [pattern, data, extra, w]);
  const frames = "trace" in result ? result.trace.frames : [];
  const last = Math.max(0, frames.length - 1);
  const k = Math.min(Math.max(0, state.step), last);
  const frame: Frame | undefined = frames[k];
  const asking = quiz && !!frame?.ask && k < last;

  const [playing, setPlaying] = useState(false);
  /** What was said about the last answer: wrong, or right with why. */
  const [said, setSaid] = useState<{ right: boolean; why?: string } | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [picking, setPicking] = useState(false);
  const cancel = useRef(false);
  // The latest state and setter for the play timer, which the board's re-renders mustn't restart.
  const latest = useRef({ state, set });
  latest.current = { state, set };

  const patch = (p: Partial<LivePatterns>) => set({ ...state, ...p });
  const go = (step: number) => {
    setSaid(null);
    patch({ step: Math.max(0, Math.min(last, step)) });
  };
  /** New inputs start the pattern again from the beginning. */
  const inputs = (p: Partial<LivePatterns>) => {
    setPlaying(false);
    setSaid(null);
    patch({ ...p, step: 0 });
  };

  useEffect(() => {
    if (!playing) return;
    if (k >= last || asking) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => latest.current.set({ ...latest.current.state, step: k + 1 }), PLAY_MS);
    return () => clearTimeout(id);
  }, [playing, k, last, asking]);

  // ——— Changing the inputs by clicking the picture ———

  const nums = (() => {
    try {
      return kind === "nums" || kind === "list" ? parseList(data, w, Infinity) : [];
    } catch {
      return [];
    }
  })();
  const most = pattern === "permute" ? PERMUTE_MAX : MAX_CELLS;
  const setNums = (vals: number[]) => inputs({ data: vals.join(", ") });
  const open = (value: string, x: number, y: number, bw: number, bh: number, commit: (v: string) => void) => {
    cancel.current = false;
    setPlaying(false);
    setEdit({ x, y, w: bw, h: bh, value, commit });
  };
  const cellEdit = {
    at: (i: number, x: number, y: number, bw: number, bh: number) =>
      open(String(nums[i]), x, y, bw, bh, (v) => {
        const x1 = typed(v);
        if (x1 === null && nums.length > 1) setNums(nums.filter((_, j) => j !== i));
        else if (x1 !== null && x1 !== undefined && x1 !== nums[i]) setNums(nums.map((u, j) => (j === i ? x1 : u)));
      }),
    add:
      nums.length < most
        ? (x: number, y: number, bw: number, bh: number) =>
            open("", x, y, bw, bh, (v) => {
              const x1 = typed(v);
              if (x1 !== null && x1 !== undefined) setNums([...nums, x1]);
            })
        : undefined,
    addTitle: w.add,
  };

  const tree = "trace" in result ? result.trace.tree : undefined;
  const treeEdit = (node: number, x: number, y: number) =>
    open(String(tree![node].val), x, y, 36, 28, (v) => {
      const x1 = typed(v);
      if (x1 === null && node > 0) inputs({ data: writeTree(tree!, node) });
      else if (x1 !== null && x1 !== undefined) inputs({ data: writeTree(tree!.map((t, j) => (j === node ? { ...t, val: x1 } : t))) });
    });
  const treeAdd = (s: Spot, x: number, y: number) =>
    open("", x, y, 36, 28, (v) => {
      const x1 = typed(v);
      if (x1 === null || x1 === undefined) return;
      const grown = tree!.map((t) => ({ ...t }));
      grown.push({ val: x1, left: -1, right: -1 });
      grown[s.parent][s.side] = grown.length - 1;
      inputs({ data: writeTree(grown) });
    });

  const start = (() => {
    const [r, c] = extra.split(/[,;\s]+/).map(Number);
    return pattern === "flood" && Number.isInteger(r) && Number.isInteger(c) ? ([r, c] as [number, number]) : null;
  })();
  const grid = (() => {
    try {
      return kind === "grid" ? parseGrid(data, w) : null;
    } catch {
      return null;
    }
  })();
  const gridClick = (r: number, c: number) => {
    if (!grid) return;
    if (picking) {
      const color = extra.split(/[,;\s]+/)[2] ?? "2";
      setPicking(false);
      return inputs({ extra: `${r}, ${c}, ${color}` });
    }
    inputs({ data: writeGrid(grid.map((row, i) => row.map((v, j) => (i === r && j === c ? (v + 1) % 4 : v)))) });
  };
  const resize = (rows: number, cols: number) => {
    if (!grid) return;
    const g = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => grid[r]?.[c] ?? 1));
    inputs({ data: writeGrid(g) });
  };

  // ——— The picture ———

  const scenes: Scene[] = [];
  if (frame && "trace" in result) {
    if (frame.cells) scenes.push(cellsScene(frames, frame, kind === "nums" ? cellEdit : null));
    if (frame.list) scenes.push(listScene(frames, frame, cellEdit));
    if (frame.tree && tree) scenes.push(treeScene(tree, frame, tree.length < MAX_TREE, treeEdit, treeAdd, w.add));
    if (frame.grid) scenes.push(gridScene(frame, start, gridClick));
    if (frame.spans) scenes.push(spansScene(frames, frame));
    if (frames.some((f) => f.rows?.length)) scenes.push(rowsScene(frames, frame));
  }
  const GAP = 14;
  let height = 4;
  const drawn = scenes.map((s, i) => {
    const el = <g key={i}>{s.draw(height)}</g>;
    height += s.h + GAP;
    return el;
  });
  height = Math.max(120, height - GAP + 4);

  const order = pattern === "traverse" ? extra : "";
  const extraLabel = w.extra[pattern];

  return (
    <>
      <div className="live-bar">
        <select
          value={pattern}
          aria-label={w.pattern}
          onChange={(e) => {
            const id = e.target.value as PatternId;
            setPicking(false);
            inputs({ pattern: id, ...PATTERN_EXAMPLES[id] });
          }}
        >
          {PATTERN_IDS.map((id) => <option key={id} value={id}>{w.names[id]}</option>)}
        </select>
        <button className="live-btn" onClick={() => inputs(PATTERN_EXAMPLES[pattern])}>{w.example}</button>
        <Toggle
          on={quiz}
          title={w.quizTip}
          onClick={() => {
            setSaid(null);
            patch({ quiz: !quiz });
          }}
        >🙋 {w.quiz}</Toggle>
      </div>
      <p className="live-hint live-pattern-idea">{w.ideas[pattern]}</p>
      <div className="live-bar">
        {kind !== "none" && (
          <label className="live-select">
            <span>{w.data[kind]}</span>
            <input
              className={`live-pattern-data${"error" in result ? " invalid" : ""}`}
              key={`${pattern}:${data}`}
              defaultValue={data}
              aria-label={w.data[kind]}
              onBlur={(e) => e.target.value !== data && inputs({ data: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          </label>
        )}
        {pattern === "traverse" ? (
          <select value={order} aria-label={extraLabel} onChange={(e) => inputs({ extra: e.target.value })}>
            {TRAVERSALS.map((o) => <option key={o} value={o}>{w.orders[o]}</option>)}
          </select>
        ) : pattern === "dp" ? (
          <label className="live-select">
            <span>{extraLabel}</span>
            <Stepper value={Number(extra) || 1} min={1} max={MAX_DP} onChange={(v) => inputs({ extra: String(v) })} less={w.less} more={w.more} />
          </label>
        ) : (
          extraLabel && (
            <label className="live-select">
              <span>{extraLabel}</span>
              <input
                className="live-pattern-extra"
                key={`${pattern}:${extra}`}
                defaultValue={extra}
                aria-label={extraLabel}
                onBlur={(e) => e.target.value !== extra && inputs({ extra: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
            </label>
          )
        )}
        {kind === "grid" && grid && (
          <>
            <Toggle on={picking} onClick={() => setPicking(!picking)}>{w.startPick}</Toggle>
            <label className="live-select">
              <span>{w.rows}</span>
              <Stepper value={grid.length} min={1} max={MAX_GRID} onChange={(v) => resize(v, grid[0].length)} less={w.less} more={w.more} />
            </label>
            <label className="live-select">
              <span>{w.cols}</span>
              <Stepper value={grid[0].length} min={1} max={MAX_GRID} onChange={(v) => resize(grid.length, v)} less={w.less} more={w.more} />
            </label>
          </>
        )}
      </div>
      <div className="live-pattern-stage">
        <svg ref={svgRef} width={SW} height={height} viewBox={`0 0 ${SW} ${height}`} fontFamily={FONT}>
          <defs>
            <marker id="pat-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={INK} />
            </marker>
            <marker id="pat-arrow-back" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={PURPLE} />
            </marker>
          </defs>
          <rect width={SW} height={height} fill="#fff" />
          {drawn}
        </svg>
        {edit && (
          <input
            className="live-pattern-edit"
            autoFocus
            defaultValue={edit.value}
            style={{ left: edit.x, top: edit.y, width: edit.w, height: edit.h }}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => {
              if (!cancel.current) edit.commit(e.target.value);
              setEdit(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                cancel.current = true;
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        )}
      </div>
      <div className="live-bar">
        <button className="live-btn" disabled={k === 0} title={w.first} aria-label={w.first} onClick={() => go(0)}>⏮</button>
        <button className="live-btn" disabled={k === 0} title={w.prev} aria-label={w.prev} onClick={() => go(k - 1)}>◀</button>
        <button
          className="live-btn primary"
          disabled={!frames.length || asking}
          title={playing ? w.pause : w.play}
          aria-label={playing ? w.pause : w.play}
          onClick={() => {
            if (playing) return setPlaying(false);
            if (k >= last) go(0);
            setPlaying(true);
          }}
        >
          {playing ? "⏸" : "⏵"} {playing ? w.pause : w.play}
        </button>
        <button className="live-btn" disabled={k >= last || asking} title={w.next} aria-label={w.next} onClick={() => go(k + 1)}>▶</button>
        <button className="live-btn" disabled={k >= last} title={w.last} aria-label={w.last} onClick={() => go(last)}>⏭</button>
        {frames.length > 0 && <span className="live-note">{fill(w.step, { k, n: last })}</span>}
      </div>
      {"error" in result ? (
        <p className="live-said">{result.error}</p>
      ) : (
        frame && (
          <div className="live-pattern-said">
            <p className={`live-said ${k === last ? "ok" : "info"}`}>{frame.note}</p>
            {asking ? (
              <div className="live-bar">
                <span className="live-pattern-q">{frame.ask!.q}</span>
                {frame.ask!.options.map((o, i) => (
                  <button
                    key={i}
                    className="live-btn"
                    onClick={() => {
                      if (i !== frame.ask!.answer) return setSaid({ right: false });
                      patch({ step: k + 1 });
                      setSaid({ right: true, why: frame.then });
                    }}
                  >
                    {o}
                  </button>
                ))}
                {said && !said.right && <span className="live-said">{w.wrong}</span>}
              </div>
            ) : (
              frame.then && k < last && <p className="live-said info live-pattern-then">→ {frame.then}</p>
            )}
            {said?.right && <p className="live-said ok">{w.right} {said.why}</p>}
          </div>
        )
      )}
      <p className="live-hint">{w.hint[kind === "nums" || kind === "list" ? "cells" : kind === "tree" ? "tree" : kind === "grid" ? "grid" : "other"]}</p>
    </>
  );
}
