// The grades each menu entry is for, so a teacher can see a grade's tools, pieces and games together (Insert's
// "By grade" view and the library's grade filter) instead of hunting through every topic menu. A band is the first and
// last grade (curriculum.ts: 1–8, 10 for 9–10, 12 for 11–12, 13 for university) in which the entry is worth opening,
// read off the syllabus grades of the skills it serves (SYLLABUS and LATER) and kept wide: a piece a grade 6 class
// uses to repair grade 4 fractions is in grade 6 too. Every entry has a band (tests/menuGrades.test.ts).
import type { Grade } from "./model/curriculum";
import { isLiveEntry, MENUS, type LiveEntry, type MenuEntry, type MenuGroup, type MenuSection } from "./menus";

type Band = readonly [from: Grade, to: Grade];
/** A menu entry's key here: a live piece's kind, or a tool's kind with the topic it opens on ("ai/descent"). */
export const entryKey = (e: MenuEntry | LiveEntry) => (isLiveEntry(e) ? e.live : e.start ? `${e.kind}/${e.start}` : e.kind);

const UNI: Band = [13, 13];
const LATE: Band = [12, 13];

export const GRADE_BANDS: Readonly<Record<string, Band>> = {
  // Arithmetic: counting
  tenFrame: [1, 2], rekenrek: [1, 3], cubes: [1, 3], rods: [1, 4], baseTen: [1, 4], hundred: [1, 3], soroban: [1, 5], numberShapes: [1, 4],
  // calculating
  mental: [1, 7], model: [2, 6], compare: [1, 7], dots: [2, 5], areaBlocks: [3, 6], numberLine: [1, 8], counters: [6, 8],
  signArrow: [6, 8], signPattern: [6, 8], division: [3, 6],
  // fractions and time
  fractions: [2, 7], compareFractions: [2, 6], clock: [1, 4],
  // Geometry
  geoLab: [3, 12], geometry: [5, 10], euclid: [7, 12], coord: [6, 12], vectors: [10, 13],
  trig: [10, 12], identities: LATE,
  // Algebra
  algebraTiles: [6, 10], formula: [6, 12], algebra: [6, 12], powers: [6, 12], polynomials: [10, 13], sequences: [8, 12],
  functions: [8, 12], graph: [8, 13], matrix: LATE, complex: LATE, space: [10, 13],
  analysis: UNI, deriv: LATE, integral: LATE, applied: LATE, multivar: UNI, surface: LATE, ode: UNI, numerical: UNI,
  // Discrete maths and data
  nt: [4, 13], logic: [8, 13], comb: [7, 13], gt: [10, 13],
  tactics: [3, 13], strategies: [3, 13], rubik: [5, 13],
  algo: [10, 13], patterns: [10, 13], problems: LATE, solver: LATE,
  coin: [3, 8], dice: [3, 8], spinner: [3, 8], cards: [5, 10], chance: [6, 10], randvar: LATE,
  statistics: [5, 12], inference: LATE, regression: LATE, likelihood: UNI, information: UNI, naiveBayes: UNI,
  // AI: the step-by-step tools, then the labs (the first models, nearest neighbours and trees, are pictures a
  // secondary class can follow)
  "ai/tensor": UNI, "ai/ops": UNI, "ai/descent": UNI, "ai/backprop": UNI, "ai/softmax": UNI, "ai/embed": UNI, "ai/svd": UNI,
  tensorLab: [10, 13], descentLab: LATE, backpropLab: UNI, fitLab: [10, 13], batchLab: UNI,
  softmaxLab: UNI, rocLab: LATE, knnLab: [8, 13], treeLab: [8, 13], kmeansLab: [10, 13], pcaLab: UNI,
  nnLab: UNI, convLab: UNI, embedLab: UNI, rnnLab: UNI, attnLab: UNI, rlLab: UNI,
  // Practice, by area
  "practice/number": [1, 8], "practice/algebra": [6, 12], "practice/geometry": [3, 12], "practice/calculus": LATE, "practice/data": [2, 12],
  // Games: number sense and patterns
  quickLook: [1, 2], estimate: [1, 7], closerTo: [1, 5], target: [1, 6], kakooma: [1, 4],
  // facts by heart
  rainPlus: [1, 4], rainTimes: [2, 7], runPlus: [1, 4], runTimes: [2, 7], joinSum: [1, 5], joinProduct: [3, 7],
  growing: [2, 7], machine: [3, 8], divisible: [4, 7], primeSlice: [4, 7], doubleLine: [5, 8],
  // fraction sense
  shadeFrac: [2, 5], fractionWall: [2, 6], equivMatch: [3, 6], fracOrder: [3, 7], stripes: [3, 6], foldStrip: [3, 6],
  fitTiles: [5, 7], findWhole: [3, 6], overflowBars: [4, 6], shareBags: [4, 6], frogJumps: [3, 6], makeOne: [3, 6],
  tileDrop: [3, 6], pizzaSlice: [2, 5],
  // algebra sense
  balance: [6, 8], exprMatch: [6, 8],
  // shape sense
  geoboard: [3, 7], mirror: [3, 6], shapeSort: [2, 6], angleGuess: [3, 6], angleHunt: [5, 8], trigBuild: [10, 12], unitCircleGame: [10, 12], slopeWalk: [8, 12], parallelLab: [5, 8], moveShape: [7, 10], buildTriangle: [8, 10], construct: [7, 10], scalePlan: [6, 8], coinStack: [8, 10], rootZoom: [7, 10], absLine: [6, 10], twoChanges: [6, 8], solid: [4, 12], turned: [12, 13], cubeMatrix: [10, 13],
  sohcahtoa: [10, 12], trigDiscover: [10, 12], pythDiscover: [8, 10], circleDiscover: [10, 12], tessellate: [3, 7],
  views3d: [4, 8], cubeNet: [4, 7],
  // chart sense
  plotPoint: [5, 8], barChart: [2, 6], makeDiagram: [2, 7], boxSplit: [7, 10], tableShares: [8, 10], fitLine: [8, 12], sampleField: [7, 10], tTails: [12, 13], secantRate: [8, 10], testPoints: [8, 10], growthRace: [10, 12], completeSquare: [8, 10], polyShape: [10, 12], graphStory: [6, 10], slopeLine: [8, 10],
  // graph puzzles: no syllabus teaches them, and any class can play them
  oneStroke: [3, 13], colourMap: [3, 13], shortestPath: [4, 13], connectTowns: [5, 13],
  // algorithms, data structures and systems
  beSort: [8, 13], beBinary: [8, 13], bePointers: [10, 13], beWindow: [10, 13], beSearch: [10, 13], beBacktrack: LATE,
  beDp: LATE, beTopo: LATE, beName: LATE, beStack: LATE, beHeap: LATE, beTree: LATE, beUnion: LATE,
  // which tool?: the method picked, not used
  whichWord: [3, 7], whichFrac: [5, 8], whichEq: [7, 10], whichQuad: [10, 12],
  // find the crux: the step a problem hinges on
  cruxWord: [4, 8], cruxEq: [7, 10],
  beCache: UNI, beBalance: UNI, beRing: UNI, beLimit: UNI, beQueue: UNI, beQuorum: UNI, beComp: UNI,
};

export const inGrade = (e: MenuEntry | LiveEntry, g: Grade): boolean => {
  const band = GRADE_BANDS[entryKey(e)];
  return !!band && band[0] <= g && g <= band[1];
};

export type GradeSection = { key: string; group: MenuGroup; section: MenuSection; items: (MenuEntry | LiveEntry)[] };
/** A grade's entries, under the menu section each comes from, in the menus' order. */
export const gradeSections = (g: Grade): GradeSection[] =>
  MENUS.flatMap((group) =>
    group.sections.map((section, n) => ({ key: `${group.label}/${n}`, group, section, items: section.items.filter((e) => inGrade(e, g)) })),
  ).filter((s) => s.items.length);
