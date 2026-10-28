// Draws a live piece inside its embeddable on the board: the piece at its design size, scaled to the element's size,
// with a button that copies what it shows as a picture. Changes go back to the board through the host, which writes
// them into the element (so they are saved and can be undone).
import { lazy, Suspense, useRef, type ComponentType } from "react";
import type { ExcalidrawEmbeddableElement, NonDeleted } from "@excalidraw/excalidraw/element/types";
import { useI18n } from "../i18n";
import { LIVE_SIZES, type LiveGraphState, type LiveKind } from "../math/live";
import { liveDataOf, type LiveData } from "./element";
import { Clock, Coin, Compare, CompareFractions, Dice, Dots, Fractions, Hundred, Spinner, TenFrame } from "./pieces";
import { Chance } from "./Chance";
import { CloserTo } from "./CloserTo";
import { Divisible } from "./Divisible";
import { PrimeSlice } from "./PrimeSlice";
import { Kakooma } from "./Kakooma";
import { LongDivision } from "./LongDivision";
import { EquivMatch } from "./EquivMatch";
import { Estimate } from "./Estimate";
import { FracOrder } from "./FracOrder";
import { FractionWall } from "./FractionWall";
import { Geoboard } from "./Geoboard";
import { NumberLine } from "./NumberLine";
import { Patterns } from "./Patterns";
import { QuickLook } from "./QuickLook";
import { Rubik } from "./Rubik";
import { ShadeGame } from "./ShadeGame";
import { Balance } from "./Balance";
import { Machine } from "./Machine";
import { Growing } from "./Growing";
import { ExprMatch } from "./ExprMatch";
import { AngleGuess } from "./AngleGuess";
import { AngleHunt } from "./AngleHunt";
import { Mirror } from "./Mirror";
import { CubeNet } from "./CubeNet";
import { PlotPoint } from "./PlotPoint";
import { BarChart } from "./BarChart";
import { GraphStory } from "./GraphStory";
import { SlopeLine } from "./SlopeLine";
import { OneStroke } from "./OneStroke";
import { ColourMap } from "./ColourMap";
import { ShortestPath } from "./ShortestPath";
import { BeSort } from "./BeSort";
import { BeSearch } from "./BeSearch";
import { BeDp } from "./BeDp";
import { BeBinary } from "./BeBinary";
import { BePointers } from "./BePointers";
import { BeWindow } from "./BeWindow";
import { BeBacktrack } from "./BeBacktrack";
import { ConnectTowns } from "./ConnectTowns";
import { DescentLab } from "./DescentLab";
import { PcaLab } from "./PcaLab";
import { SoftmaxLab } from "./SoftmaxLab";
import { EmbedLab } from "./EmbedLab";
import { BackpropLab } from "./BackpropLab";
import { TensorLab } from "./TensorLab";
import { Soroban } from "./Soroban";
import { Target } from "./Target";
import type { PieceProps } from "./ui";

export type LiveHost = {
  update: (id: string, data: LiveData) => void;
  /** Puts a picture of the piece beside it. */
  snapshot: (id: string, svg: SVGSVGElement) => void;
  /** Puts an ordinary graph (the graph tool's, editable there) beside a live graph, with the sliders' values put in. */
  freezeGraph: (id: string, state: LiveGraphState) => void;
};

// The graph needs mathjs, so it loads the first time a board has one.
const LiveGraph = lazy(() => import("./LiveGraph").then((m) => ({ default: m.LiveGraph })));
// The interview problems are many solvers, so they load the first time a board has one.
const Problems = lazy(() => import("./Problems").then((m) => ({ default: m.Problems })));
// The solver likewise: its patterns and its formula language load the first time a board has one.
const Solver = lazy(() => import("./Solver").then((m) => ({ default: m.Solver })));

const PIECES: { [K in LiveKind]: ComponentType<PieceProps<K>> } = {
  clock: Clock,
  dice: Dice,
  spinner: Spinner,
  coin: Coin,
  fractions: Fractions,
  tenFrame: TenFrame,
  hundred: Hundred,
  dots: Dots,
  graph: LiveGraph,
  chance: Chance,
  compare: Compare,
  compareFractions: CompareFractions,
  division: LongDivision,
  rubik: Rubik,
  soroban: Soroban,
  patterns: Patterns,
  problems: Problems,
  solver: Solver,
  numberLine: NumberLine,
  geoboard: Geoboard,
  estimate: Estimate,
  quickLook: QuickLook,
  target: Target,
  closerTo: CloserTo,
  divisible: Divisible,
  primeSlice: PrimeSlice,
  kakooma: Kakooma,
  fractionWall: FractionWall,
  equivMatch: EquivMatch,
  fracOrder: FracOrder,
  shadeFrac: ShadeGame,
  balance: Balance,
  machine: Machine,
  growing: Growing,
  exprMatch: ExprMatch,
  angleGuess: AngleGuess,
  angleHunt: AngleHunt,
  mirror: Mirror,
  cubeNet: CubeNet,
  plotPoint: PlotPoint,
  barChart: BarChart,
  graphStory: GraphStory,
  slopeLine: SlopeLine,
  oneStroke: OneStroke,
  colourMap: ColourMap,
  shortestPath: ShortestPath,
  connectTowns: ConnectTowns,
  beSort: BeSort,
  beSearch: BeSearch,
  beDp: BeDp,
  beBinary: BeBinary,
  bePointers: BePointers,
  beWindow: BeWindow,
  beBacktrack: BeBacktrack,
  descentLab: DescentLab,
  pcaLab: PcaLab,
  softmaxLab: SoftmaxLab,
  embedLab: EmbedLab,
  backpropLab: BackpropLab,
  tensorLab: TensorLab,
};

export function LiveView({ element, host }: { element: NonDeleted<ExcalidrawEmbeddableElement>; host: LiveHost }) {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const data = liveDataOf(element);
  if (!data) return null;
  const kind = data.live;
  const [W, H] = LIVE_SIZES[kind];
  // The element's padding is its stroke width on each side.
  const [w, h] = [element.width - 2 * element.strokeWidth, element.height - 2 * element.strokeWidth];
  const s = Math.max(0.05, Math.min(w / W, h / H));
  const Piece = PIECES[kind] as ComponentType<PieceProps<typeof kind>>;
  return (
    <div className="live-host">
      <div
        className={`live live-${kind}`}
        style={{ width: W, height: H, transform: `translate(${(w - W * s) / 2}px, ${(h - H * s) / 2}px) scale(${s})` }}
      >
        <Suspense fallback={null}>
          <Piece state={data.state} set={(state) => host.update(element.id, { live: kind, state })} w={t.live} svgRef={svgRef} />
        </Suspense>
        <button
          className="live-snap"
          title={kind === "graph" ? t.live.freeze : t.live.snapshot}
          aria-label={kind === "graph" ? t.live.freeze : t.live.snapshot}
          onClick={() => {
            if (kind === "graph") host.freezeGraph(element.id, data.state as LiveGraphState);
            else if (svgRef.current) host.snapshot(element.id, svgRef.current);
          }}
        >
          📷
        </button>
      </div>
    </div>
  );
}
