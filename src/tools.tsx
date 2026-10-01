// Every tool in one table: its dialog (loaded the first time it opens), its menu entry and its edit label.
// The board page, the menus and the tool search are all built from this list.
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { Dict } from "./locales/en";

/** Keys of the dictionary that hold a plain string. */
type Word = { [K in keyof Dict]: Dict[K] extends string ? K : never }[keyof Dict];

/** What every tool dialog accepts. `initial` is the stored spec when editing; `start` opens a given topic or tab. */
export type ToolDialogProps = {
  initial?: unknown;
  start?: string;
  onSubmit: (data: unknown, image: { svg?: string; dataURL?: string; width: number; height: number }) => void;
  onClose: () => void;
};

export type ToolKind =
  | "formula" | "graph" | "model" | "3d" | "matrix" | "geometry" | "analysis" | "statistics" | "integral" | "ode"
  | "trig" | "algo" | "nt" | "comb" | "gt" | "logic" | "complex" | "mental" | "tactics" | "algebra" | "powers" | "coord";

export type Tool = {
  Dialog: LazyExoticComponent<ComponentType<ToolDialogProps>>;
  /** Label of the edit button when a picture of this kind is selected. */
  edit: Word;
  /** The dialog returns a PNG snapshot instead of an SVG. */
  png?: boolean;
  /** For the tool search: the dialog's tabs (key → label; the key opens that tab), their hints, and more names per tab. */
  topics?: (t: Dict) => Record<string, string>;
  hints?: (t: Dict) => Record<string, string>;
  names?: (t: Dict) => Record<string, Record<string, string>>;
};

// Each dialog types its own spec; here they are all the same shape.
const load = <M,>(importer: () => Promise<M>, name: keyof M) =>
  lazy(() => importer().then((m) => ({ default: m[name] as unknown as ComponentType<ToolDialogProps> })));

export const TOOLS: Record<ToolKind, Tool> = {
  formula: { Dialog: load(() => import("./components/FormulaDialog"), "FormulaDialog"), edit: "editFormula" },
  graph: { Dialog: load(() => import("./components/GraphDialog"), "GraphDialog"), edit: "editGraph" },
  model: { Dialog: load(() => import("./components/ModelDialog"), "ModelDialog"), edit: "editModel", topics: (t) => ({ bar: t.barModel, fraction: t.fractions, percent: t.percent, bond: t.numberBond, placeValue: t.placeValue, multiply: t.multiplication, division: t.division, fracop: t.fracOps, percratio: t.percRatio }) },
  "3d": { Dialog: load(() => import("./components/ThreeDialog"), "default"), edit: "edit3d", png: true, topics: (t) => ({ solid: t.solids, cubes: t.unitCubes, transform3d: t.matrix3d }) },
  matrix: { Dialog: load(() => import("./components/MatrixDialog"), "MatrixDialog"), edit: "editMatrix", topics: (t) => ({ calc: t.matrixCalc, transform: t.matrixTransform, space: t.matrixSpaces }), hints: (t) => ({ space: Object.values(t.spaceHints).join(" ") }) },
  geometry: { Dialog: load(() => import("./components/GeometryDialog"), "GeometryDialog"), edit: "editGeometry" },
  analysis: { Dialog: load(() => import("./components/AnalysisDialog"), "AnalysisDialog"), edit: "editAnalysis", topics: (t) => t.analysisTopics, hints: (t) => t.analysisHints },
  statistics: { Dialog: load(() => import("./components/StatsDialog"), "StatsDialog"), edit: "editStatistics", topics: (t) => t.statTopics, hints: (t) => t.statHints },
  integral: { Dialog: load(() => import("./components/IntegralDialog"), "IntegralDialog"), edit: "editIntegral", topics: (t) => t.intTopics, hints: (t) => t.intHints },
  ode: { Dialog: load(() => import("./components/OdeDialog"), "OdeDialog"), edit: "editOde", topics: (t) => t.odeTopics, hints: (t) => t.odeHints },
  trig: { Dialog: load(() => import("./components/TrigDialog"), "TrigDialog"), edit: "editTrig", topics: (t) => t.trigTopics, hints: (t) => t.trigHints },
  algo: { Dialog: load(() => import("./components/AlgoDialog"), "AlgoDialog"), edit: "editAlgo", topics: (t) => t.algoTopics,
    hints: (t) => t.algoHints,
    names: (t) => {
      const w = t.algoWords;
      return { sort: w.sortNames, search: w.searchNames, graph: w.graphNames, tree: w.treeNames, ds: w.dsNames, dp: w.dpNames };
    } },
  nt: { Dialog: load(() => import("./components/NtDialog"), "NtDialog"), edit: "editNt", topics: (t) => t.ntTopics, hints: (t) => t.ntHints },
  comb: { Dialog: load(() => import("./components/CombDialog"), "CombDialog"), edit: "editComb", topics: (t) => t.combTopics, hints: (t) => t.combHints, names: (t) => ({ count: t.combWords.countNames }) },
  gt: { Dialog: load(() => import("./components/GtDialog"), "GtDialog"), edit: "editGt", topics: (t) => t.gtTopics, hints: (t) => t.gtHints },
  logic: { Dialog: load(() => import("./components/LogicDialog"), "LogicDialog"), edit: "editLogic", topics: (t) => t.logicTopics, hints: (t) => t.logicHints },
  complex: { Dialog: load(() => import("./components/ComplexDialog"), "ComplexDialog"), edit: "editComplex", topics: (t) => t.cxTopics, hints: (t) => t.cxHints },
  mental: { Dialog: load(() => import("./components/MentalDialog"), "MentalDialog"), edit: "editMental", topics: (t) => t.mentalTopics, hints: (t) => t.mentalHints },
  tactics: { Dialog: load(() => import("./components/TacticsDialog"), "TacticsDialog"), edit: "editTactics", topics: (t) => t.tacticsTopics, hints: (t) => t.tacticsHints },
  algebra: { Dialog: load(() => import("./components/AlgebraDialog"), "AlgebraDialog"), edit: "editAlgebra", topics: (t) => t.algebraTopics, hints: (t) => t.algebraHints },
  coord: { Dialog: load(() => import("./components/CoordDialog"), "CoordDialog"), edit: "editCoord", topics: (t) => t.coordTopics, hints: (t) => t.coordHints },
  powers: { Dialog: load(() => import("./components/PowersDialog"), "PowersDialog"), edit: "editPowers", topics: (t) => t.powersTopics, hints: (t) => t.powersHints },
};

export const isToolKind = (k: unknown): k is ToolKind => typeof k === "string" && Object.hasOwn(TOOLS, k);

/** A menu entry: a tool, optionally opened on a given topic. */
export type MenuEntry = { kind: ToolKind; icon: string; label: Word; start?: string };
export type MenuGroup = { icon: string; label: Word; title?: Word; items: MenuEntry[] };

export const MENUS: MenuGroup[] = [
  {
    icon: "🧮", label: "groupArithmetic", items: [
      { kind: "model", icon: "🧮", label: "counting", start: "placeValue" },
      { kind: "model", icon: "▦", label: "models" },
      { kind: "mental", icon: "🧠", label: "mental" },
    ],
  },
  {
    icon: "📐", label: "groupGeometryShort", title: "groupGeometry", items: [
      { kind: "geometry", icon: "📐", label: "geometry" },
      { kind: "coord", icon: "xy", label: "coord" },
      { kind: "trig", icon: "θ", label: "trig" },
      { kind: "3d", icon: "🧊", label: "threeD" },
    ],
  },
  {
    icon: "∑", label: "groupAlgebraShort", title: "groupAlgebra", items: [
      { kind: "formula", icon: "∑", label: "formula" },
      { kind: "graph", icon: "📈", label: "graph" },
      { kind: "algebra", icon: "⚖", label: "algebra" },
      { kind: "powers", icon: "xⁿ", label: "powers" },
      { kind: "matrix", icon: "[ ]", label: "matrices" },
      { kind: "complex", icon: "ℂ", label: "complex" },
      { kind: "analysis", icon: "ε", label: "analysis" },
      { kind: "integral", icon: "∫", label: "integrals" },
      { kind: "ode", icon: "y′", label: "odes" },
    ],
  },
  {
    icon: "ℤ", label: "groupDiscreteShort", title: "groupDiscrete", items: [
      { kind: "nt", icon: "ℤ", label: "nt" },
      { kind: "comb", icon: "ⁿCₖ", label: "comb" },
      { kind: "gt", icon: "⬡", label: "gt" },
      { kind: "logic", icon: "∧", label: "logic" },
      { kind: "tactics", icon: "♟", label: "tactics" },
      { kind: "algo", icon: "⇅", label: "algo" },
      { kind: "statistics", icon: "📊", label: "statistics" },
    ],
  },
];
