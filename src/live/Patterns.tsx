// The algorithm patterns on the board: pick one of the fifteen, change its numbers, tree or grid by clicking them, and
// step through it, play it, or (with "Your turn") say what happens before each move. The frames come from
// patternSteps.ts and the pictures of them from scenes.tsx; this file puts them together and makes them editable.
import { useEffect, useMemo, useRef, useState } from "react";
import type { LivePatterns } from "../math/live";
import {
  MAX_CELLS, MAX_DP, MAX_GRID, MAX_TREE, PATTERN_DATA, PATTERN_EXAMPLES, PATTERN_IDS, PERMUTE_MAX, parseGrid, parseList,
  patternTrace, TRAVERSALS, writeGrid, writeTree, type Frame, type PatternId, type Trace,
} from "../math/patternSteps";
import { cellsScene, gridScene, listScene, Markers, rowsScene, spansScene, SW, treeScene, type Scene, type Spot } from "./scenes";
import { fill, FONT, Stepper, Toggle, type PieceProps } from "./ui";

/** A box on the picture to type into, and what to do with what is typed. */
type Edit = { x: number; y: number; w: number; h: number; value: string; commit: (v: string) => void };
const PLAY_MS = 1100;
/** A number typed into a box: empty means "remove it", and anything else that isn't a number is ignored. */
const typed = (v: string): number | null | undefined => {
  const t = v.trim().replace(/[−–]/g, "-");
  if (!t) return null;
  const x = Number(t);
  return Number.isFinite(x) ? x : undefined;
};
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
          <Markers />
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
