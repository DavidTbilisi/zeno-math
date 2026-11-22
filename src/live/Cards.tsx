// Playing cards on the board, for chance and statistics, in four modes (the maths is src/math/cards.ts):
//   Draw and count  cards drawn one at a time, put back or kept out, counted by suit, colour, rank or kind against
//                   the deck's own share; kept out, the next card's chance changes as the deck thins.
//   Given that…     all 52 cards; the ones outside B fade, and P(A | B) is A counted among what is left.
//   Two cards       the tree of P(A first) × P(B second | A first), with or without putting back, and pairs drawn.
//   Sample means    samples of n cards: the histogram of their means piles up round 7 and narrows as n grows.
// Worked by hand: the deck is tapped for a card (two cards, a sample) and held to deal faster and faster; the cards
// drawn are dragged back onto it to shuffle them in. The events A and B and the sample's size are wheels turned by
// dragging up or down; the ways of counting and of putting back are pills in the strip above the picture.
// The pictures are public/cards/*.svg; they are fetched once and drawn as data URLs, so "Copy as a picture" keeps them.
import { useEffect, useReducer, type ReactNode } from "react";
import {
  ALL_CARDS, CARD_MODES, cardFile, cardName, conditional, CONDITIONS, decimal, DECK, drawMore, drawPairs, drawSamples,
  EVENTS, fracText, fracValue, freshDraw, freshMeans, groupCounts, GROUPS, inEvent, MAX_DRAWS, MAX_SAMPLE, meanBins, meanSd,
  meanStats, nextChance, POP_SD, RANK_LABELS, reduce, sumDistribution, SUIT_SIGNS, twoCards, valueOf,
  type Condition, type Frac, type LiveCards,
} from "../math/cards";
import { inBox, keyTap, NumBox, Pill, Tabs, useDrag, useHold, type HoldHand } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

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

/** The back of the deck, with how many cards are in it (or another caption); tapped and held through `hand`. */
function Deck({ x, y, w, left, caption, hand }: { x: number; y: number; w: number; left: number; caption?: string; hand: HoldHand }) {
  const h = w * TALL;
  const layers = Math.min(4, Math.ceil(left / 13));
  return (
    <g role="button" tabIndex={0} aria-label={hand.label} style={{ cursor: "pointer" }} {...hand.props}>
      <title>{hand.label}</title>
      {Array.from({ length: layers }, (_, i) => (
        <rect key={i} x={x + i * 2} y={y - i * 2} width={w} height={h} rx={w * 0.06} fill="#1971c2" stroke="#fff" strokeWidth={1.5} />
      ))}
      {!left && <rect x={x} y={y} width={w} height={h} rx={w * 0.06} fill="#fff" stroke="#adb5bd" strokeDasharray="5 4" />}
      {hand.hot && <rect x={x - 4} y={y - 10} width={w + 14} height={h + 14} rx={w * 0.1} fill="none" stroke={GREEN} strokeWidth={3} />}
      {caption && <text x={x + w / 2} y={y + h + 18} fontSize={14} textAnchor="middle" fill={INK}>{caption}</text>}
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


/** Cards dealt out, to drag back onto the deck (or Delete) to start again; a ghost follows the pointer while dragged. */
function useGather(deck: { x: number; y: number; w: number; h: number }, again: () => void) {
  const { drag, begin, svgProps } = useDrag<{ id: number }>((d) => {
    if (d.moved && inBox(deck, d.x, d.y)) again();
  });
  const over = !!drag?.moved && inBox(deck, drag.x, drag.y);
  const pile = (label: string, n: number, children: ReactNode, id: number) => (
    <g role="button" tabIndex={0} aria-label={label} style={{ cursor: n ? "grab" : "default" }}
      onPointerDown={(e) => n && begin(e, { id })}
      onKeyDown={(e) => (e.key === "Delete" || e.key === "Backspace" ? again() : keyTap(e, again))}>
      <title>{label}</title>
      {children}
    </g>
  );
  const ghost = (w: number) =>
    drag?.moved ? <Card id={drag.id} x={drag.x - w / 2} y={drag.y - (w * TALL) / 2} w={w} ring={over ? GREEN : undefined} /> : null;
  return { svgProps, pile, ghost, over };
}

// ——— The piece ———

const SW = W;
const SH = 96;

export function Cards({ state, set, w: words, svgRef }: Props) {
  const w = words.cards;
  const mode = state.mode;
  const props = { state, set, w, svgRef };
  return (
    <>
      {mode === "draw" && <DrawMode {...props} />}
      {mode === "given" && <GivenMode {...props} />}
      {mode === "two" && <TwoMode {...props} />}
      {mode === "means" && <MeansMode {...props} />}
      <p className="live-hint">{w.hints[mode]}</p>
    </>
  );
}

type ModeProps = { state: LiveCards; set: (s: LiveCards) => void; w: Words; svgRef: Props["svgRef"] };

/** The strip above the picture: the ways of working as tabs, then the mode's own wheels and pills. */
function Strip({ state, set, w, children }: Omit<ModeProps, "svgRef"> & { children: ReactNode }) {
  return (
    <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} className="hand-pic" fontFamily={FONT}>
      <Tabs x={8} y={4} keys={CARD_MODES} on={state.mode} names={w.modes} onPick={(mode) => set({ ...state, mode })} />
      {children}
    </svg>
  );
}

/** Width of a pill holding `text`. */
const pillW = (text: string, size = 14) => Math.max(60, text.length * size * 0.6 + 24);

/** A wheel of events with its name above it: drag up or down, tap its top or bottom half, or the arrow keys. */
function EventWheel<E extends Condition>({ x, label, value, options, onChange, w }: {
  x: number; label: string; value: E; options: readonly E[]; onChange: (e: E) => void; w: Words;
}) {
  const bw = 196;
  return (
    <g>
      <text x={x + 4} y={52} fontSize={12} fill="#495057">{label}</text>
      <NumBox x={x} y={56} w={bw} h={38} size={14} value={options.indexOf(value)} min={0} max={options.length - 1}
        label={label} show={(i) => w.events[options[i]]} onChange={(i) => onChange(options[i])} />
    </g>
  );
}

/** The bar labels and colours of a grouping. */
function groupLook(g: LiveCards["draw"]["group"], w: Words): { labels: string[]; colors: string[] } {
  const pale = { red: "#ffa8a8", black: "#adb5bd", blue: "#74c0fc" };
  switch (g) {
    case "suit": return { labels: [...SUIT_SIGNS], colors: [pale.black, pale.red, pale.red, pale.black] };
    case "colour": return { labels: [w.colours.red, w.colours.black], colors: [pale.red, pale.black] };
    case "rank": return { labels: RANK_LABELS, colors: Array(13).fill(pale.blue) };
    case "kind": return { labels: [w.kinds.ace, w.kinds.number, w.kinds.face], colors: Array(3).fill(pale.blue) };
  }
}

function DrawMode({ state, set, w, svgRef }: ModeProps) {
  const put = (draw: LiveCards["draw"]) => set({ ...state, draw });
  const { shown: d, hand } = useHold(
    state.draw, (s, m) => drawMore(s, m, Math.random), (s) => (s.replace ? MAX_DRAWS - s.n : Math.min(s.left.length, MAX_DRAWS - s.n)), put,
    w.deck,
  );
  usePictures(d.shown);
  const CW = 58;
  const deckBox = { x: 16, y: 12, w: CW, h: CW * TALL };
  const gather = useGather(deckBox, () => put(freshDraw(d.group, d.replace, d.focus)));
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
  const back = pillW(w.replace);
  return (
    <>
      <Strip state={state} set={set} w={w}>
        <Tabs x={8} y={58} keys={GROUPS} on={d.group} names={w.groups} size={13} onPick={(g) => put(freshDraw(g, d.replace, d.focus))} />
        <Pill x={SW - 8 - back} y={58} w={back} h={28} size={13} text={w.replace} on={d.replace}
          onTap={() => put(freshDraw(d.group, !d.replace, d.focus))} />
      </Strip>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" {...gather.svgProps}>
        <rect width={W} height={H} fill="#fff" />
        <Deck x={deckBox.x} y={deckBox.y} w={CW} left={d.replace ? DECK : d.left.length} caption={fill(w.left, { n: d.replace ? DECK : d.left.length })}
          hand={{ ...hand, hot: hand.hot || gather.over }} />
        {d.shown.length ? gather.pile(w.gather, d.n, d.shown.map((id, i) => (
          <Card key={`${i}-${id}`} id={id} x={104 + i * (CW + 10)} y={12} w={CW} ring={i === d.shown.length - 1 ? GREEN : undefined} />
        )), d.shown[d.shown.length - 1]) : <text x={104} y={60} fontSize={15} fill={GREY}>{w.noneYet}</text>}
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
        {gather.ghost(CW)}
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
      <Strip state={state} set={set} w={w}>
        <EventWheel x={8} label={w.eventA} value={a} options={EVENTS} onChange={(e) => put({ a: e, b })} w={w} />
        <EventWheel x={220} label={w.eventB} value={b} options={CONDITIONS} onChange={(e) => put({ a, b: e })} w={w} />
      </Strip>
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

function TwoMode({ state, set, w, svgRef }: ModeProps) {
  const t0 = state.two;
  const put = (two: Partial<LiveCards["two"]>, keep = false) =>
    set({ ...state, two: { ...t0, ...two, ...(keep ? {} : { tally: { n: 0, firstHits: 0, both: 0 }, last: null }) } });
  type Drawn = { tally: LiveCards["two"]["tally"]; last: LiveCards["two"]["last"] };
  const { shown, hand } = useHold<Drawn>(
    { tally: t0.tally, last: t0.last }, (s, m) => drawPairs(s.tally, t0.a, t0.b, t0.replace, m, Math.random), (s) => MAX_DRAWS - s.tally.n,
    (s) => put(s, true), w.deckTwo,
  );
  const t = { ...t0, ...shown };
  usePictures(t.last ?? []);
  const DW = 40;
  const deckBox = { x: 8, y: 131 - (DW * TALL) / 2, w: DW, h: DW * TALL };
  const gather = useGather(deckBox, () => put({}));
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
  const back = pillW(w.replaceFirst, 13);
  return (
    <>
      <Strip state={state} set={set} w={w}>
        <EventWheel x={8} label={w.first} value={t.a} options={EVENTS} onChange={(a) => put({ a })} w={w} />
        <EventWheel x={214} label={w.second} value={t.b} options={EVENTS} onChange={(b) => put({ b })} w={w} />
        <Pill x={SW - 8 - back} y={60} w={back} h={30} size={13} text={w.replaceFirst} on={t.replace} onTap={() => put({ replace: !t.replace })} />
      </Strip>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" {...gather.svgProps}>
        <rect width={W} height={H} fill="#fff" />
        <text x={16} y={20} fontSize={14} fill={GREY}>{fill(w.key, { a: A, b: B })}</text>
        {mids.map((m, i) => branch(54, 131, 230, m.y, i ? tree.firstNot : tree.first, `m${i}`, !i))}
        {leaves.map((l, i) => branch(250, mids[i < 2 ? 0 : 1].y, 400, l.y, i % 2 ? not(i < 2 ? tree.yes : tree.no) : i < 2 ? tree.yes : tree.no, `l${i}`, i === 0))}
        <Deck x={deckBox.x} y={deckBox.y} w={DW} left={DECK} hand={{ ...hand, hot: hand.hot || gather.over }} />
        {mids.map((m, i) => <text key={i} x={240} y={m.y + 5} fontSize={16} fontWeight={700} textAnchor="middle" fill={i ? INK : GREEN}>{m.label}</text>)}
        {leaves.map((l, i) => (
          <g key={i}>
            <text x={410} y={l.y + 5} fontSize={16} fontWeight={700} fill={i ? INK : GREEN}>{l.label}</text>
            <text x={470} y={l.y + 5} fontSize={14} fill={i ? "#495057" : GREEN} fontWeight={i ? 400 : 700}>{fracText(reduce(l.p))}</text>
          </g>
        ))}
        {t.last ? (
          gather.pile(w.gatherTwo, n, t.last.map((id, i) => (
            <Card key={`${i}-${id}`} id={id} x={16 + i * (CW + 8)} y={272} w={CW} ring={inEvent(i ? t.b : t.a, id) ? GREEN : undefined} />
          )), t.last[1])
        ) : (
          <text x={16} y={300} fontSize={15} fill={GREY}>{w.noneYet}</text>
        )}
        <Lines lines={[fill(w.pairs, { n: n.toLocaleString() }), ...lines]} x={150} y={286} w={W - 160} gap={24} />
        {gather.ghost(CW)}
      </svg>
    </>
  );
}

function MeansMode({ state, set, w, svgRef }: ModeProps) {
  const put = (means: LiveCards["means"]) => set({ ...state, means });
  const { shown: s, hand } = useHold(state.means, (m0, m) => drawSamples(m0, m, Math.random), (m0) => MAX_DRAWS - m0.samples, put, w.deckMeans);
  usePictures(s.last);
  const DW = 52;
  const deckBox = { x: 16, y: 8, w: DW, h: DW * TALL };
  const gather = useGather(deckBox, () => put(freshMeans(s.size)));
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
  const x0 = 16 + DW + 20;
  const CW = Math.min(50, (W - x0 - 16) / s.size - 6);
  return (
    <>
      <Strip state={state} set={set} w={w}>
        <text x={12} y={52} fontSize={12} fill="#495057">{w.size}</text>
        <NumBox x={8} y={56} w={84} h={38} size={18} value={s.size} min={1} max={MAX_SAMPLE} label={w.size} onChange={(size) => put(freshMeans(size))} />
        <text x={106} y={80} fontSize={13} fill={GREY}>{w.values}</text>
      </Strip>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" {...gather.svgProps}>
        <rect width={W} height={H} fill="#fff" />
        <Deck x={deckBox.x} y={deckBox.y} w={DW} left={DECK} hand={{ ...hand, hot: hand.hot || gather.over }} />
        {s.last.length ? (
          gather.pile(w.gatherMeans, s.samples, s.last.map((id, i) => <Card key={`${i}-${id}`} id={id} x={x0 + i * (CW + 6)} y={8} w={CW} />), s.last[0])
        ) : (
          <text x={x0} y={50} fontSize={15} fill={GREY}>{w.noneYet}</text>
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
        {gather.ghost(CW)}
      </svg>
    </>
  );
}

const round2 = (v: number) => (Math.round(v * 100) / 100).toString();
