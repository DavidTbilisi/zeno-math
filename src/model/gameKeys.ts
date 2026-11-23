// Every game with a ladder in the Games menu (menus.ts) and where it keeps that ladder in this browser (its useGame
// key). The roadmaps ask for games by these ids (roadmap.ts), and a teacher assigns them to a class (server/classGames.ts):
// a signed-in student's browser then sends the stars of each assigned game, so the teacher sees who has played and
// passed it. Here in src/model so the server can check a game id without the pieces themselves.
import type { LiveKind } from "../math/live.ts";

export const GAME_KEYS = {
  quickLook: "zeno.quicklook.v1",
  estimate: "zeno.estimate.v1",
  closerTo: "zeno.closerto.v1",
  target: "zeno.target.v1",
  kakooma: "zeno.kakooma.v1",
  growing: "zeno.growing.v1",
  machine: "zeno.machine.v1",
  divisible: "zeno.divisible.v1",
  primeSlice: "zeno.primeSlice.v1",
  doubleLine: "zeno.doubleline.v1",
  shadeFrac: "zeno.shadefrac.v1",
  fractionWall: "zeno.fractionwall.v1",
  equivMatch: "zeno.equivmatch.v1",
  fracOrder: "zeno.fracorder.v1",
  stripes: "zeno.stripes.v1",
  foldStrip: "zeno.foldstrip.v1",
  fitTiles: "zeno.fittiles.v1",
  findWhole: "zeno.findwhole.v1",
  overflowBars: "zeno.overflow.v1",
  shareBags: "zeno.sharebags.v1",
  frogJumps: "zeno.frog.v1",
  makeOne: "zeno.makeone.v1",
  tileDrop: "zeno.tiledrop.v1",
  pizzaSlice: "zeno.pizza.v1",
  balance: "zeno.balance.v1",
  exprMatch: "zeno.exprmatch.v1",
  geoboard: "zeno.geoplay.v1",
  mirror: "zeno.mirror.v1",
  angleGuess: "zeno.angleguess.v1",
  angleHunt: "zeno.anglehunt.v1",
  trigBuild: "zeno.trigbuild.v1",
  unitCircleGame: "zeno.unitcircle.v1",
  sohcahtoa: "zeno.sohcahtoa.v1",
  trigDiscover: "zeno.trigdiscover.v1",
  pythDiscover: "zeno.pythdiscover.v1",
  circleDiscover: "zeno.circlediscover.v1",
  tessellate: "zeno.tessellate.v1",
  cubeNet: "zeno.cubenet.v1",
  plotPoint: "zeno.plotpoint.v1",
  barChart: "zeno.barchart.v1",
  makeDiagram: "zeno.makediagram.v1",
  graphStory: "zeno.graphstory.v1",
  slopeLine: "zeno.slopeline.v1",
  oneStroke: "zeno.onestroke.v1",
  colourMap: "zeno.colourmap.v1",
  shortestPath: "zeno.shortestpath.v1",
  connectTowns: "zeno.connecttowns.v1",
  beSort: "zeno.besort.v1",
  beBinary: "zeno.bebinary.v1",
  bePointers: "zeno.bepointers.v1",
  beWindow: "zeno.bewindow.v1",
  beSearch: "zeno.besearch.v1",
  beBacktrack: "zeno.bebacktrack.v1",
  beDp: "zeno.bedp.v1",
  beTopo: "zeno.betopo.v1",
  beName: "zeno.bename.v1",
  beStack: "zeno.bestack.v1",
  beHeap: "zeno.beheap.v1",
  beTree: "zeno.betree.v1",
  beUnion: "zeno.beunion.v1",
  beCache: "zeno.becache.v1",
  beBalance: "zeno.bebalance.v1",
  beRing: "zeno.bering.v1",
  beLimit: "zeno.belimit.v1",
  beQueue: "zeno.bequeue.v1",
  beQuorum: "zeno.bequorum.v1",
  beComp: "zeno.becomp.v1",
} as const satisfies Partial<Record<LiveKind, string>>;
export type GameId = keyof typeof GAME_KEYS;
export const GAME_IDS = Object.keys(GAME_KEYS) as GameId[];
export const isGameId = (v: unknown): v is GameId => typeof v === "string" && Object.hasOwn(GAME_KEYS, v);

/** The stars that pass a puzzle (PASS_STARS in src/math/ladder.ts): a ladder is passed with this many on every puzzle. */
export const GAME_PASS_STARS = 2;
/** More puzzles than any ladder has: a longer list of stars is refused. */
export const MAX_PUZZLES = 40;
/** The most games a class can have assigned at once. */
export const MAX_CLASS_GAMES = 30;

/** A ladder's stars as sent by a browser (0–3 for each puzzle), or null if they aren't that. */
export function parseStars(v: unknown): number[] | null {
  if (!Array.isArray(v) || !v.length || v.length > MAX_PUZZLES) return null;
  return v.every((s) => Number.isInteger(s) && s >= 0 && s <= 3) ? (v as number[]) : null;
}
/** The best of two records of one ladder, puzzle by puzzle: stars are only ever won, never lost. */
export const mergeStars = (a: readonly number[], b: readonly number[]): number[] =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => Math.max(a[i] ?? 0, b[i] ?? 0));
/** Whether a ladder is passed: every puzzle has at least two stars. */
export const ladderDone = (stars: readonly number[]) => stars.length > 0 && stars.every((s) => s >= GAME_PASS_STARS);
