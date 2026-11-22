// Every live piece's component, by kind: what the board draws inside an embeddable (LiveView) and what a page of the
// site shows inline (InlinePiece).
import { lazy, type ComponentType } from "react";
import type { LiveKind } from "../math/live";
import type { PieceProps } from "./ui";
import { CompareFractions } from "./CompareFractions";
import { Coin, Dice, Spinner } from "./Throws";
import { Clock } from "./Clock";
import { Fractions } from "./Fractions";
import { Hundred } from "./Hundred";
import { Compare } from "./Compare";
import { Dots } from "./Dots";
import { TenFrame } from "./TenFrame";
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
import { Stripes } from "./Stripes";
import { FoldStrip } from "./FoldStrip";
import { FitTiles } from "./FitTiles";
import { Balance } from "./Balance";
import { Machine } from "./Machine";
import { Growing } from "./Growing";
import { NumberShapes } from "./NumberShapes";
import { AlgebraTiles } from "./AlgebraTiles";
import { BaseTen } from "./BaseTen";
import { Cubes } from "./Cubes";
import { Counters } from "./Counters";
import { SignArrow } from "./SignArrow";
import { SignPattern } from "./SignPattern";
import { Cards } from "./Cards";
import { GeoLab } from "./GeoLab";
import { ExprMatch } from "./ExprMatch";
import { AngleGuess } from "./AngleGuess";
import { AngleHunt } from "./AngleHunt";
import { Mirror } from "./Mirror";
import { Views3d } from "./Views3d";
import { CubeNet } from "./CubeNet";
import { PlotPoint } from "./PlotPoint";
import { BarChart } from "./BarChart";
import { MakeDiagram } from "./MakeDiagram";
import { GraphStory } from "./GraphStory";
import { SlopeLine } from "./SlopeLine";
import { TrigBuild } from "./TrigBuild";
import { UnitCircleGame } from "./UnitCircleGame";
import { SohCahToa } from "./SohCahToa";
import { TrigDiscover } from "./TrigDiscover";
import { PythDiscover } from "./PythDiscover";
import { CircleDiscover } from "./CircleDiscover";
import { Tessellate } from "./Tessellate";
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
import { BeHeap } from "./BeHeap";
import { BeTree } from "./BeTree";
import { BeStack } from "./BeStack";
import { BeUnion } from "./BeUnion";
import { BeCache } from "./BeCache";
import { BeBalance } from "./BeBalance";
import { BeRing } from "./BeRing";
import { BeLimit } from "./BeLimit";
import { BeQuorum } from "./BeQuorum";
import { BeQueue } from "./BeQueue";
import { BeComp } from "./BeComp";
import { BeTopo } from "./BeTopo";
import { BeName } from "./BeName";
import { ConnectTowns } from "./ConnectTowns";
import { DescentLab } from "./DescentLab";
import { PcaLab } from "./PcaLab";
import { FitLab } from "./FitLab";
import { BatchLab } from "./BatchLab";
import { RocLab } from "./RocLab";
import { KnnLab } from "./KnnLab";
import { TreeLab } from "./TreeLab";
import { KmeansLab } from "./KmeansLab";
import { NnLab } from "./NnLab";
import { ConvLab } from "./ConvLab";
import { AttnLab } from "./AttnLab";
import { RnnLab } from "./RnnLab";
import { RlLab } from "./RlLab";
import { SoftmaxLab } from "./SoftmaxLab";
import { EmbedLab } from "./EmbedLab";
import { BackpropLab } from "./BackpropLab";
import { TensorLab } from "./TensorLab";
import { Soroban } from "./Soroban";
import { Target } from "./Target";

// The graph needs mathjs, so it loads the first time a board has one.
const LiveGraph = lazy(() => import("./LiveGraph").then((m) => ({ default: m.LiveGraph })));
// The interview problems are many solvers, so they load the first time a board has one.
const Problems = lazy(() => import("./Problems").then((m) => ({ default: m.Problems })));
// The solver likewise: its patterns and its formula language load the first time a board has one.
const Solver = lazy(() => import("./Solver").then((m) => ({ default: m.Solver })));

export const PIECES: { [K in LiveKind]: ComponentType<PieceProps<K>> } = {
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
  stripes: Stripes,
  foldStrip: FoldStrip,
  fitTiles: FitTiles,
  balance: Balance,
  machine: Machine,
  growing: Growing,
  numberShapes: NumberShapes,
  algebraTiles: AlgebraTiles,
  baseTen: BaseTen,
  cubes: Cubes,
  counters: Counters,
  signArrow: SignArrow,
  signPattern: SignPattern,
  cards: Cards,
  geoLab: GeoLab,
  exprMatch: ExprMatch,
  angleGuess: AngleGuess,
  angleHunt: AngleHunt,
  mirror: Mirror,
  views3d: Views3d,
  cubeNet: CubeNet,
  plotPoint: PlotPoint,
  barChart: BarChart,
  makeDiagram: MakeDiagram,
  graphStory: GraphStory,
  slopeLine: SlopeLine,
  trigBuild: TrigBuild,
  unitCircleGame: UnitCircleGame,
  sohcahtoa: SohCahToa,
  trigDiscover: TrigDiscover,
  pythDiscover: PythDiscover,
  circleDiscover: CircleDiscover,
  tessellate: Tessellate,
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
  beHeap: BeHeap,
  beTree: BeTree,
  beStack: BeStack,
  beUnion: BeUnion,
  beCache: BeCache,
  beBalance: BeBalance,
  beRing: BeRing,
  beLimit: BeLimit,
  beQuorum: BeQuorum,
  beQueue: BeQueue,
  beComp: BeComp,
  beTopo: BeTopo,
  beName: BeName,
  descentLab: DescentLab,
  pcaLab: PcaLab,
  softmaxLab: SoftmaxLab,
  embedLab: EmbedLab,
  backpropLab: BackpropLab,
  tensorLab: TensorLab,
  fitLab: FitLab,
  batchLab: BatchLab,
  rocLab: RocLab,
  knnLab: KnnLab,
  treeLab: TreeLab,
  kmeansLab: KmeansLab,
  nnLab: NnLab,
  convLab: ConvLab,
  attnLab: AttnLab,
  rnnLab: RnnLab,
  rlLab: RlLab,
};
