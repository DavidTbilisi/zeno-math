// The decision-tree lab: cut a plane of two classes into boxes by hand, one straight cut across one feature at a time,
// watching how much each cut lowers the impurity; then let a tree grow itself to a depth, and a forest of trees vote.
// Six puzzles open in turn, each won with a Check, stars for doing one at the first try; free play takes any dataset
// and every control. What is mid-way (a drag, a slider being moved) stays here until it is let go, so each change is
// one step to undo. Built on the game shell (useGame).
import { useState, type PointerEvent } from "react";
import {
  accuracy,
  bestSplit,
  controlsOf,
  DEPTH_MAX,
  findNode,
  FOREST_DEPTH,
  FOREST_SIZES,
  FREE_DATA,
  fromPx,
  grow,
  judgeTree,
  leafAt,
  leaves,
  MEASURES,
  modelOf,
  num,
  PLANE,
  snapT,
  testOf,
  trainOf,
  TREE_LADDER,
  TREE_NOTICES,
  TREE_PLOT,
  treeOf,
  treePoints,
  treePuzzle,
  treeStars,
  treeSvg,
  type Axis,
  type LiveTree,
  type TreeNode,
} from "../math/treeLab";
import { play } from "./juice";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { PillRows, pillRowsH, Track, type RowItem } from "./hand";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveTree> = { tries: 0, done: false, said: null };
const stagePatch = (stage: number): Partial<LiveTree> => TREE_LADDER[stage].start;
const FREE_PATCH: Partial<LiveTree> = { splits: [], sel: "", axis: 0, t: 0.5, measure: "gini", depth: 0, trees: 1, data: "blobs" };

/** Whether a cut falls strictly inside a box, so it makes two boxes. */
const inside = (n: TreeNode, axis: Axis, t: number) => (axis ? t > n.box.y0 && t < n.box.y1 : t > n.box.x0 && t < n.box.x1);

export function TreeLab({ state, set, w: words, svgRef }: PieceProps<"treeLab">) {
  const [w, g] = [words.treeLab, words.game];
  const [draft, setDraft] = useState<Partial<LiveTree> | null>(null);
  const [dragging, setDragging] = useState(false);
  const d: LiveTree = { ...state, ...draft };
  const p = treePuzzle(d);
  const can = controlsOf(d);
  const ps = treePoints(d);
  const [train, test] = [trainOf(ps), testOf(ps)];
  const byHand = !d.depth;
  const tree = byHand ? treeOf(d.splits, train) : null;
  const picked = tree && d.sel !== null ? findNode(tree, d.sel) : null;
  const leaf = picked && !picked.kids ? picked : null;

  const fresh = (change: Partial<LiveTree>): Partial<LiveTree> => ({ ...change, done: false, said: null });
  const commit = (change: Partial<LiveTree> = {}) => {
    setDraft(null);
    set({ ...d, ...change });
  };
  const game = useGame({ key: "zeno.treelab.v1", size: TREE_LADDER.length, notices: TREE_NOTICES, modes: ["puzzle", "free"], state: d, set: commit, fresh: FRESH, stagePatch, freePatch: FREE_PATCH });

  const check = () => {
    if (!p) return;
    const v = judgeTree(d, p.goal);
    if (v.state === "won") return game.win({ stars: treeStars(d.tries), notice: () => p.notice, patch: { done: true } });
    game.miss({ tries: d.tries + 1, said: { kind: "wrong", why: v.why } });
  };

  // Tapping the plane picks the box under it and puts the cut there; dragging moves the cut.
  const at = (e: PointerEvent<SVGSVGElement>) => fromPx(...svgPoint(e.currentTarget, e));
  const down = (e: PointerEvent<SVGSVGElement>) => {
    const [px, py] = svgPoint(e.currentTarget, e);
    const onPlane = px >= PLANE.left && px <= PLANE.left + PLANE.size && py >= PLANE.top && py <= PLANE.top + PLANE.size;
    if (!onPlane || d.done || !tree || !can.includes("split")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const q = at(e);
    setDraft(fresh({ sel: leafAt(tree, { x: q[0], y: q[1] }).path, t: snapT(q[d.axis]) }));
  };
  const move = (e: PointerEvent<SVGSVGElement>) => dragging && setDraft({ ...draft, t: snapT(at(e)[d.axis]) });
  const up = () => {
    if (!dragging) return;
    setDragging(false);
    play("snap");
    commit();
  };

  const canSplit = !!leaf && inside(leaf, d.axis, d.t) && !d.done;
  const split = () => {
    if (!leaf || !canSplit) return;
    play("good");
    commit(fresh({ splits: [...d.splits, { path: leaf.path, axis: d.axis, t: d.t }], sel: null }));
  };
  const unsplit = () => {
    const last = d.splits[d.splits.length - 1];
    if (last) commit(fresh({ splits: d.splits.slice(0, -1), sel: last.path, axis: last.axis, t: last.t }));
  };
  const best = () => {
    if (!leaf || !tree) return;
    const b = bestSplit(train.filter((q) => leafAt(tree, q) === leaf), d.measure);
    if (b && b.gain > 1e-12) commit(fresh({ splits: [...d.splits, { path: leaf.path, axis: b.axis, t: b.t }], sel: null }));
  };

  const mdl = modelOf(d, train);
  const ask = p ? fill(w.asks[`p${d.stage + 1}` as keyof typeof w.asks], { one: num(accuracy({ tree: grow(train, FOREST_DEPTH, d.measure) }, test)), min: p.goal.kind === "forest" ? num(p.goal.min) : "" }) : w.freeAsk;
  const verdict = p && d.said?.kind === "wrong" ? judgeTree(d, p.goal) : null;
  const wrong = verdict?.state === "lost" ? verdict : null;
  const stars = treeStars(d.tries);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const counted = (why: string, v: number) => (why === "impure" || why === "tooMany" ? String(v) : num(v));
  const hint = !p ? w.freeHint : can.includes("depth") ? w.depthHint : can.includes("forest") ? w.forestHint : w.hint;
  const line: Line =
    d.done ? { tone: notice ? "notice" : "ok", text: `${notice ? `${notice} ` : ""}${fill(w.right, { stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}` }
    : wrong ? { tone: "wrong", text: fill(w.why[wrong.why], { have: counted(wrong.why, wrong.have), want: counted(wrong.why, wrong.want) }) }
    : { tone: "hint", text: hint };
  const a = num(accuracy(mdl, train));
  const read = ("tree" in mdl ? fill(w.read, { leaves: leaves(mdl.tree).length, a }) : fill(w.readForest, { n: d.trees, a })) + (test.length ? fill(w.readTest, { t: num(accuracy(mdl, test)) }) : "");
  const depthMin = p ? 1 : 0;

  const handCuts = byHand && can.includes("split");
  const moves: RowItem[] = [
    ...(p ? [{ text: `✓ ${g.check}`, title: g.check, strong: true, disabled: d.done, onTap: check }] : []),
    ...(handCuts
      ? [
          ...([0, 1] as Axis[]).map((ax) => ({ text: ax ? w.axes.y : w.axes.x, on: d.axis === ax, disabled: d.done, onTap: () => commit(fresh({ axis: ax })) })),
          { text: w.split, disabled: !canSplit, onTap: split },
          { text: w.unsplit, disabled: !d.splits.length || d.done, onTap: unsplit },
          ...(!p ? [{ text: w.bestCut, disabled: !leaf, onTap: best }] : []),
        ]
      : []),
    ...(can.includes("measure") ? MEASURES.map((m, i) => ({ text: w.measures[m], brk: i === 0 && handCuts, on: d.measure === m, onTap: () => commit({ measure: m }) })) : []),
    ...(!p
      ? [
          ...FREE_DATA.map((id, i) => ({ text: w.datas[id], brk: i === 0, on: d.data === id, onTap: () => commit({ data: id, splits: [], sel: "" }) })),
          { text: w.newSample, onTap: () => commit({ seed: d.seed + 1, splits: [], sel: "" }) },
        ]
      : []),
  ];
  const dials = [...(handCuts ? ["cut" as const] : []), ...(can.includes("depth") ? ["depth" as const] : []), ...(can.includes("forest") && !byHand ? ["trees" as const] : [])];
  const DW = (TREE_PLOT.w - 16 - (dials.length - 1) * 8) / Math.max(1, dials.length);
  const dialH = dials.length ? 44 : 0;
  const strip = dialH + pillRowsH(moves, TREE_PLOT.w) + 8;

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          className="hand-pic"
          width={TREE_PLOT.w}
          height={TREE_PLOT.h + strip}
          viewBox={`0 0 ${TREE_PLOT.w} ${TREE_PLOT.h + strip}`}
          fontFamily={FONT}
          aria-label={w.picture}
          style={{ cursor: byHand && can.includes("split") ? (dragging ? "grabbing" : d.axis ? "ns-resize" : "ew-resize") : "default", touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect width={TREE_PLOT.w} height={TREE_PLOT.h + strip} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: treeSvg(d, w.chart, !p) }} />
          {dials.map((k, i) => {
            const x = 8 + i * (DW + 8);
            const y = TREE_PLOT.h + 4;
            if (k === "cut")
              return (
                <Track key={k} x={x} y={y} w={DW} value={Math.round(d.t * 200)} min={0} max={200} label={w.cut} disabled={d.done} show={(v) => `${["x", "y"][d.axis]} < ${(v / 200).toFixed(3)}`}
                  onChange={(v, done) => (done ? commit(fresh({ t: v / 200, sel: d.sel ?? "" })) : setDraft(fresh({ t: v / 200, sel: d.sel ?? "" })))} />
              );
            if (k === "depth")
              return (
                <Track key={k} x={x} y={y} w={DW} value={d.depth} min={depthMin} max={DEPTH_MAX} label={w.depth} disabled={d.done} color="#2f9e44" lead={124} show={(v) => `${w.depth}: ${v || w.byHand}`}
                  onChange={(v, done) => (done ? commit(fresh({ depth: v })) : setDraft(fresh({ depth: v })))} />
              );
            return (
              <Track key={k} x={x} y={y} w={DW} value={Math.max(0, FOREST_SIZES.indexOf(d.trees))} min={0} max={FOREST_SIZES.length - 1} label={w.trees} disabled={d.done} color="#e8590c" show={(v) => `${w.trees}: ${FOREST_SIZES[v]}`}
                onChange={(v, done) => (done ? commit(fresh({ trees: FOREST_SIZES[v] })) : setDraft(fresh({ trees: FOREST_SIZES[v] })))} />
            );
          })}
          <PillRows w={TREE_PLOT.w} y={TREE_PLOT.h + dialH} items={moves} />
        </svg>
      </Stage>
      <div className="descent-read">
        <span>{read}</span>
      </div>
      <GameActions game={game} g={g} done={d.done && !!p} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
