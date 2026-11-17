// Playing cards on the board, for chance and statistics, in four modes (the maths is src/math/cards.ts):
//   Draw and count  cards drawn one at a time, put back or kept out, counted by suit, colour, rank or kind against
//                   the deck's own share; kept out, the next card's chance changes as the deck thins.
//   Given that…     all 52 cards; the ones outside B fade, and P(A | B) is A counted among what is left.
//   Two cards       the tree of P(A first) × P(B second | A first), with or without putting back, and pairs drawn.
//   Sample means    samples of n cards: the histogram of their means piles up round 7 and narrows as n grows.
// The pictures are public/cards/*.svg; they are fetched once and drawn as data URLs, so "Copy as a picture" keeps them.
import { useEffect, useReducer } from "react";
import {
  ALL_CARDS, CARD_MODES, cardFile, cardName, conditional, CONDITIONS, decimal, DECK, drawMore, drawPairs, drawSamples,
  EVENTS, fracText, fracValue, freshDraw, freshMeans, groupCounts, GROUPS, inEvent, MAX_DRAWS, MAX_SAMPLE, meanBins, meanSd,
  meanStats, nextChance, POP_SD, RANK_LABELS, reduce, sumDistribution, SUIT_SIGNS, twoCards, valueOf,
  type CardEvent, type Condition, type Frac, type Group, type LiveCards,
} from "../math/cards";
import { fill, FONT, INK, Stepper, Toggle, type PieceProps } from "./ui";

const W = 660;
const H = 420;
/** A card's height over its width (the pictures are 167 × 243). */
const TALL = 242.667 / 167.087;
const GREEN = "#2f9e44";
const RED = "#e03131";
const GREY = "#868e96";

type Props = PieceProps<"cards">;
type Words = Props["w"]["cards"];

// ——— The pictures ———

const pics = new Map<number, string>();
const url = (id: number) => `${import.meta.env.BASE_URL}cards/${cardFile(id)}`;

/** The cards' pictures as data URLs once they have come (the plain file until then); the piece draws again when they do. */
function usePictures(ids: number[]) {
  const [, again] = useReducer((x: number) => x + 1, 0);
  const missing = [...new Set(ids)].filter((id) => !pics.has(id));
  const key = missing.join(",");
  useEffect(() => {
    if (!key) return;
    let live = true;
    Promise.all(
      key.split(",").map(Number).map((id) =>
        fetch(url(id))
          .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
          .then((svg) => pics.set(id, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)),
      ),
    )
      .catch(() => { /* the plain file is still drawn; only "Copy as a picture" misses it */ })
      .finally(() => live && again());
    return () => { live = false; };
  }, [key]);
}

function Card({ id, x, y, w, faded, ring, label }: { id: number; x: number; y: number; w: number; faded?: boolean; ring?: string; label?: string }) {
  const h = w * TALL;
  return (
    <g opacity={faded ? 0.16 : 1} role="img" aria-label={label ?? cardName(id)}>
      <rect x={x} y={y} width={w} height={h} rx={w * 0.06} fill="#fff" />
      <image href={pics.get(id) ?? url(id)} x={x} y={y} width={w} height={h} preserveAspectRatio="none" />
      {ring && <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={w * 0.08} fill="none" stroke={ring} strokeWidth={3} />}
    </g>
  );
}

/** The back of the deck, with how many cards are in it. */
function Deck({ x, y, w, left, words }: { x: number; y: number; w: number; left: number; words: Words }) {
  const h = w * TALL;
  const layers = Math.min(4, Math.ceil(left / 13));
  return (
    <g>
      {Array.from({ length: layers }, (_, i) => (
        <rect key={i} x={x + i * 2} y={y - i * 2} width={w} height={h} rx={w * 0.06} fill="#1971c2" stroke="#fff" strokeWidth={1.5} />
      ))}
      {!left && <rect x={x} y={y} width={w} height={h} rx={w * 0.06} fill="none" stroke="#adb5bd" strokeDasharray="5 4" />}
      <text x={x + w / 2} y={y + h + 18} fontSize={14} textAnchor="middle" fill={INK}>{fill(words.left, { n: left })}</text>
    </g>
  );
}

// ——— A bar chart ———

/** A round step for an axis up to `max`: 1, 2 or 5 times a power of ten. */
function niceStep(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
}

function Bars({ box, values, expected, labels, colors, focus, onFocus, labelEvery = 1, legend }: {
  box: { x: number; y: number; w: number; h: number };
  /** What the red dashes are. */
  legend: string;
  values: number[];
  expected: number[];
  labels: string[];
  colors: string[] | string;
  focus?: number;
  onFocus?: (i: number) => void;
  labelEvery?: number;
}) {
  const top = Math.max(0.05, ...values, ...expected) * 1.12;
  const step = niceStep(top);
  const yMax = Math.ceil(top / step) * step;
  const base = box.y + box.h;
  const y = (v: number) => base - (v / yMax) * box.h;
  const slot = box.w / values.length;
  const bw = Math.min(56, slot * 0.72);
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  return (
    <g>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={box.x} x2={box.x + box.w} y1={y(v)} y2={y(v)} stroke="#e9ecef" />
          <text x={box.x - 6} y={y(v) + 4} fontSize={12} textAnchor="end" fill={GREY}>{v.toFixed(digits)}</text>
        </g>
      ))}
      <line x1={box.x} x2={box.x + box.w} y1={base} y2={base} stroke={INK} strokeWidth={1.5} />
      <line x1={box.x + box.w - 150} x2={box.x + box.w - 122} y1={box.y - 14} y2={box.y - 14} stroke={RED} strokeWidth={2.5} strokeDasharray="6 4" />
      <text x={box.x + box.w - 116} y={box.y - 9} fontSize={13} fill={RED}>{legend}</text>
      {values.map((v, i) => {
        const cx = box.x + slot * (i + 0.5);
        const on = i === focus;
        const color = typeof colors === "string" ? colors : colors[i];
        return (
          <g key={i} style={onFocus ? { cursor: "pointer" } : undefined} onClick={onFocus && (() => onFocus(i))}>
            <rect x={cx - slot / 2} y={box.y} width={slot} height={box.h} fill="transparent" />
            <rect x={cx - bw / 2} y={y(v)} width={bw} height={Math.max(0, base - y(v))} fill={color} stroke={on ? INK : "#495057"} strokeWidth={on ? 3 : 1} />
            <line x1={cx - bw / 2 - 4} x2={cx + bw / 2 + 4} y1={y(expected[i])} y2={y(expected[i])} stroke={RED} strokeWidth={2.5} strokeDasharray="6 4" />
            {i % labelEvery === 0 && (
              <text x={cx} y={base + 18} fontSize={values.length > 13 ? 12 : 15} textAnchor="middle" fill={labels[i].match(/[♥♦]/) ? RED : INK} fontWeight={on ? 700 : 400}>{labels[i]}</text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Lines of words under a picture, the first in bold; a long line is set smaller to fit. */
function Lines({ lines, x, y, w = W - 2 * x, gap = 25 }: { lines: string[]; x: number; y: number; w?: number; gap?: number }) {
  return (
    <>
      {lines.map((l, i) => {
        const fit = Math.min(16, (w / l.length) * 1.9);
        return <text key={i} x={x} y={y + i * gap} fontSize={fit} fill={i ? "#343a40" : INK} fontWeight={i ? 400 : 700}>{l}</text>;
      })}
    </>
  );
}

const TIMES = [1, 10, 100, 1000];

// ——— The piece ———

export function Cards({ state, set, w: words, svgRef }: Props) {
  const w = words.cards;
  const mode = state.mode;
  return (
    <>
      <div className="live-bar">
        {CARD_MODES.map((m) => <Toggle key={m} on={mode === m} onClick={() => set({ ...state, mode: m })}>{w.modes[m]}</Toggle>)}
      </div>
      {mode === "draw" && <DrawMode state={state} set={set} w={w} reset={words.reset} svgRef={svgRef} />}
      {mode === "given" && <GivenMode state={state} set={set} w={w} svgRef={svgRef} />}
      {mode === "two" && <TwoMode state={state} set={set} w={w} reset={words.reset} svgRef={svgRef} />}
      {mode === "means" && <MeansMode state={state} set={set} w={w} reset={words.reset} svgRef={svgRef} />}
      <p className="live-hint">{w.hints[mode]}</p>
    </>
  );
}

type ModeProps = { state: LiveCards; set: (s: LiveCards) => void; w: Words; svgRef: Props["svgRef"]; reset?: string };

function EventSelect<E extends string>({ value, options, onChange, label, w }: { value: E; options: readonly E[]; onChange: (e: E) => void; label: string; w: Words }) {
  return (
    <label className="live-select">
      <span>{label}</span>
      <select value={value} aria-label={label} onChange={(e) => onChange(e.target.value as E)}>
        {options.map((e) => <option key={e} value={e}>{w.events[e as Condition]}</option>)}
      </select>
    </label>
  );
}

/** The bar labels and colours of a grouping. */
function groupLook(g: Group, w: Words): { labels: string[]; colors: string[] } {
  const pale = { red: "#ffa8a8", black: "#adb5bd", blue: "#74c0fc" };
  switch (g) {
    case "suit": return { labels: [...SUIT_SIGNS], colors: [pale.black, pale.red, pale.red, pale.black] };
    case "colour": return { labels: [w.colours.red, w.colours.black], colors: [pale.red, pale.black] };
    case "rank": return { labels: RANK_LABELS, colors: Array(13).fill(pale.blue) };
    case "kind": return { labels: [w.kinds.ace, w.kinds.number, w.kinds.face], colors: Array(3).fill(pale.blue) };
  }
}

function DrawMode({ state, set, w, reset, svgRef }: ModeProps) {
  const d = state.draw;
  usePictures(d.shown);
  const put = (draw: LiveCards["draw"]) => set({ ...state, draw });
  const { labels, colors } = groupLook(d.group, w);
  const deck = groupCounts(d.group);
  const name = labels[d.focus];
  const k = d.counts[d.focus];
  const theory: Frac = { n: deck[d.focus], d: DECK };
  const next = nextChance(d, d.focus);
  const lines = [fill(w.drawn, { n: d.n.toLocaleString() })];
  if (d.n) lines.push(fill(w.share, { name, k: k.toLocaleString(), n: d.n.toLocaleString(), f: decimal(k / d.n), p: fracText(theory) }));
  else lines.push(fill(w.theory, { name, p: fracText(theory) }));
  if (d.replace) lines.push(fill(w.nextBack, { name, p: fracText(next) }));
  else if (!d.left.length) lines.push(fill(w.nextShuffled, { name, p: fracText(next) }));
  else lines.push(fill(w.nextLeft, { d: next.d, k: next.n, name, p: fracText(next) }));
  if (!d.replace && d.n && d.n % DECK === 0) lines.push(w.whole);
  const CW = 58;
  return (
    <>
      <div className="live-bar">
        <select value={d.group} aria-label={w.groupBy} onChange={(e) => put(freshDraw(e.target.value as Group, d.replace, d.focus))}>
          {GROUPS.map((g) => <option key={g} value={g}>{w.groups[g]}</option>)}
        </select>
        <Toggle on={d.replace} onClick={() => put(freshDraw(d.group, !d.replace, d.focus))}>{w.replace}</Toggle>
      </div>
      <div className="live-bar">
        {TIMES.map((m) => (
          <button key={m} className="live-btn primary" disabled={d.n >= MAX_DRAWS} onClick={() => put(drawMore(d, m, Math.random))}>
            {m === 1 ? w.drawOne : `×${m}`}
          </button>
        ))}
        <button className="live-btn" onClick={() => put(freshDraw(d.group, d.replace, d.focus))}>{reset}</button>
      </div>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}>
        <rect width={W} height={H} fill="#fff" />
        <Deck x={16} y={12} w={CW} left={d.replace ? DECK : d.left.length} words={w} />
        {d.shown.map((id, i) => <Card key={`${i}-${id}`} id={id} x={104 + i * (CW + 10)} y={12} w={CW} ring={i === d.shown.length - 1 ? GREEN : undefined} />)}
        {!d.shown.length && <text x={104} y={60} fontSize={15} fill={GREY}>{w.noneYet}</text>}
        <Bars
          box={{ x: 52, y: 136, w: W - 66, h: 150 }}
          values={d.counts.map((c) => (d.n ? c / d.n : 0))}
          expected={deck.map((c) => c / DECK)}
          labels={labels}
          colors={colors}
          focus={d.focus}
          onFocus={(focus) => put({ ...d, focus })}
          legend={w.expected}
        />
        <Lines lines={lines} x={16} y={330} />
      </svg>
    </>
  );
}

function GivenMode({ state, set, w, svgRef }: ModeProps) {
  const { a, b } = state.given;
  usePictures(ALL_CARDS);
  const put = (given: LiveCards["given"]) => set({ ...state, given });
  const c = conditional(a, b);
  const A = w.events[a];
  const B = w.events[b];
  const lines = [fill(w.pa, { a: A, k: c.pa.n, p: fracText(c.pa) })];
  if (b === "any") lines.push(w.noCondition);
  else {
    lines.push(fill(w.given, { b: B, d: c.given.d, n: c.given.n, a: A, p: fracText(c.given) }));
    if (c.pb.n) lines.push(fill(w.check, { ab: `${c.pBoth.n}/52`, b: `${c.pb.n}/52`, p: fracText(reduce(c.given)) }));
    lines.push(c.effect > 0 ? w.likelier : c.effect < 0 ? w.lessLikely : w.independent);
  }
  // Suits in rows, ranks in columns; the order the rows are drawn in is spades, hearts, clubs, diamonds, so colours alternate.
  const rows = [0, 1, 3, 2];
  const CW = 46;
  const GAP = 4;
  const x0 = (W - 13 * CW - 12 * GAP) / 2;
  return (
    <>
      <div className="live-bar">
        <EventSelect value={a} options={EVENTS} onChange={(e: CardEvent) => put({ a: e, b })} label={w.eventA} w={w} />
        <EventSelect value={b} options={CONDITIONS} onChange={(e: Condition) => put({ a, b: e })} label={w.eventB} w={w} />
      </div>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}>
        <rect width={W} height={H} fill="#fff" />
        {rows.map((suit, r) =>
          Array.from({ length: 13 }, (_, rank) => {
            const id = suit * 13 + rank;
            const inB = inEvent(b, id);
            return (
              <Card key={id} id={id} x={x0 + rank * (CW + GAP)} y={8 + r * (CW * TALL + 6)} w={CW} faded={!inB} ring={inB && inEvent(a, id) ? GREEN : undefined} />
            );
          }),
        )}
        <Lines lines={lines} x={16} y={8 + 4 * (CW * TALL + 6) + 20} gap={24} />
      </svg>
    </>
  );
}

function TwoMode({ state, set, w, reset, svgRef }: ModeProps) {
  const t = state.two;
  usePictures(t.last ?? []);
  const put = (two: Partial<LiveCards["two"]>, keep = false) =>
    set({ ...state, two: { ...t, ...two, ...(keep ? {} : { tally: { n: 0, firstHits: 0, both: 0 }, last: null }) } });
  const tree = twoCards(t.a, t.b, t.replace);
  const A = w.events[t.a];
  const B = w.events[t.b];
  const not = (f: Frac): Frac => ({ n: f.d - f.n, d: f.d });
  const leaves = [
    { y: 26, label: "B", p: { n: tree.first.n * tree.yes.n, d: tree.first.d * tree.yes.d } },
    { y: 96, label: w.notB, p: { n: tree.first.n * (tree.yes.d - tree.yes.n), d: tree.first.d * tree.yes.d } },
    { y: 166, label: "B", p: { n: tree.firstNot.n * tree.no.n, d: tree.firstNot.d * tree.no.d } },
    { y: 236, label: w.notB, p: { n: tree.firstNot.n * (tree.no.d - tree.no.n), d: tree.firstNot.d * tree.no.d } },
  ];
  const mids = [{ y: 61, label: "A" }, { y: 201, label: w.notA }];
  const branch = (x1: number, y1: number, x2: number, y2: number, f: Frac, key: string, strong?: boolean) => (
    <g key={key}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={strong ? GREEN : "#adb5bd"} strokeWidth={strong ? 3 : 2} />
      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 7} fontSize={15} textAnchor="middle" fill={strong ? GREEN : INK} fontWeight={strong ? 700 : 400}
        stroke="#fff" strokeWidth={4} paintOrder="stroke">{`${f.n}/${f.d}`}</text>
    </g>
  );
  const { n, firstHits, both } = t.tally;
  const lines = [
    fill(w.both, { a: A, b: B, f1: `${tree.first.n}/${tree.first.d}`, f2: `${tree.yes.n}/${tree.yes.d}`, p: fracText(tree.both), v: decimal(fracValue(tree.both)) }),
    fill(w.secondAny, { b: B, p: fracText(reduce({ n: tree.both.n * tree.notThen.d + tree.notThen.n * tree.both.d, d: tree.both.d * tree.notThen.d })) }),
  ];
  if (n) {
    lines.push(fill(w.hits, { k: both.toLocaleString(), n: n.toLocaleString(), f: decimal(both / n) }));
    if (firstHits) lines.push(fill(w.afterA, { k: firstHits.toLocaleString(), m: both.toLocaleString(), f: decimal(both / firstHits), p: `${tree.yes.n}/${tree.yes.d}` }));
  }
  const CW = 54;
  return (
    <>
      <div className="live-bar">
        <EventSelect value={t.a} options={EVENTS} onChange={(a: CardEvent) => put({ a })} label={w.first} w={w} />
        <EventSelect value={t.b} options={EVENTS} onChange={(b: CardEvent) => put({ b })} label={w.second} w={w} />
        <Toggle on={t.replace} onClick={() => put({ replace: !t.replace })}>{w.replaceFirst}</Toggle>
      </div>
      <div className="live-bar">
        {TIMES.map((m) => (
          <button key={m} className="live-btn primary" disabled={n >= MAX_DRAWS} onClick={() => put(drawPairs(t.tally, t.a, t.b, t.replace, m, Math.random), true)}>
            {m === 1 ? w.drawTwo : `×${m}`}
          </button>
        ))}
        <button className="live-btn" onClick={() => put({})}>{reset}</button>
      </div>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}>
        <rect width={W} height={H} fill="#fff" />
        <text x={16} y={20} fontSize={14} fill={GREY}>{fill(w.key, { a: A, b: B })}</text>
        {mids.map((m, i) => branch(40, 131, 230, m.y, i ? tree.firstNot : tree.first, `m${i}`, !i))}
        {leaves.map((l, i) => branch(250, mids[i < 2 ? 0 : 1].y, 400, l.y, i % 2 ? not(i < 2 ? tree.yes : tree.no) : i < 2 ? tree.yes : tree.no, `l${i}`, i === 0))}
        <circle cx={34} cy={131} r={6} fill={INK} />
        {mids.map((m, i) => <text key={i} x={240} y={m.y + 5} fontSize={16} fontWeight={700} textAnchor="middle" fill={i ? INK : GREEN}>{m.label}</text>)}
        {leaves.map((l, i) => (
          <g key={i}>
            <text x={410} y={l.y + 5} fontSize={16} fontWeight={700} fill={i ? INK : GREEN}>{l.label}</text>
            <text x={470} y={l.y + 5} fontSize={14} fill={i ? "#495057" : GREEN} fontWeight={i ? 400 : 700}>{fracText(reduce(l.p))}</text>
          </g>
        ))}
        {t.last ? (
          t.last.map((id, i) => <Card key={`${i}-${id}`} id={id} x={16 + i * (CW + 8)} y={272} w={CW} ring={inEvent(i ? t.b : t.a, id) ? GREEN : undefined} />)
        ) : (
          <text x={16} y={300} fontSize={15} fill={GREY}>{w.noneYet}</text>
        )}
        <Lines lines={[fill(w.pairs, { n: n.toLocaleString() }), ...lines]} x={150} y={286} w={W - 160} gap={24} />
      </svg>
    </>
  );
}

function MeansMode({ state, set, w, reset, svgRef }: ModeProps) {
  const s = state.means;
  usePictures(s.last);
  const put = (means: LiveCards["means"]) => set({ ...state, means });
  const bins = meanBins(s.size);
  const seen = Array(bins.count).fill(0);
  s.sums.forEach((k, i) => (seen[bins.binOf(i)] += k));
  const exact = Array(bins.count).fill(0);
  sumDistribution(s.size).forEach((p, i) => (exact[bins.binOf(i)] += p));
  const labels = Array.from({ length: bins.count }, (_, i) => String(bins.centre(i)));
  const stats = meanStats(s);
  const lastMean = s.last.length ? s.last.reduce((t, id) => t + valueOf(id), 0) / s.last.length : null;
  const lines = [fill(w.samples, { n: s.samples.toLocaleString(), size: s.size })];
  if (lastMean !== null) lines.push(fill(w.lastMean, { cards: s.last.map((id) => valueOf(id)).join(" + "), n: s.size, m: round2(lastMean) }));
  lines.push(fill(w.pop, { s: round2(POP_SD) }));
  if (stats) lines.push(fill(w.yours, { m: round2(stats.mean), s: round2(stats.sd) }));
  lines.push(fill(w.spread, { n: s.size, s: round2(meanSd(s.size)) }));
  const CW = Math.min(52, (W - 32) / s.size - 6);
  return (
    <>
      <div className="live-bar">
        <span>{w.size}</span>
        <Stepper value={s.size} min={1} max={MAX_SAMPLE} onChange={(size) => put(freshMeans(size))} less={w.fewer} more={w.moreCards} />
        <span className="live-note">{w.values}</span>
      </div>
      <div className="live-bar">
        {TIMES.map((m) => (
          <button key={m} className="live-btn primary" disabled={s.samples >= MAX_DRAWS} onClick={() => put(drawSamples(s, m, Math.random))}>
            {m === 1 ? w.drawSample : `×${m}`}
          </button>
        ))}
        <button className="live-btn" onClick={() => put(freshMeans(s.size))}>{reset}</button>
      </div>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}>
        <rect width={W} height={H} fill="#fff" />
        {s.last.length ? (
          s.last.map((id, i) => <Card key={`${i}-${id}`} id={id} x={16 + i * (CW + 6)} y={8} w={CW} />)
        ) : (
          <text x={16} y={50} fontSize={15} fill={GREY}>{w.noneYet}</text>
        )}
        <Bars
          box={{ x: 52, y: 106, w: W - 66, h: 150 }}
          values={seen.map((k) => (s.samples ? k / s.samples : 0))}
          expected={exact}
          labels={labels}
          colors="#74c0fc"
          labelEvery={bins.width < 1 ? 2 : 1}
          legend={w.expected}
        />
        <Lines lines={lines} x={16} y={300} gap={24} />
      </svg>
    </>
  );
}

const round2 = (v: number) => (Math.round(v * 100) / 100).toString();

