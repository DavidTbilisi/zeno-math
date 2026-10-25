// What the solver is made of: the kinds of data it reads, the patterns (skeletons) it runs, the slots a pattern has,
// the presets that fill them for well-known problems, and the piece's saved state.
import type { Dict } from "../../locales/en";
import type { Trace } from "../patternSteps";
import type { Env } from "./expr";

export type SolverWords = Dict["live"]["solver"];
export type Errors = SolverWords["errors"];

export const DATA_KINDS = ["nums", "text", "range", "pair", "grid", "items", "edges"] as const;
export type DataKind = (typeof DATA_KINDS)[number];
export const PATTERN_KINDS = ["window", "twoptr", "mono", "bsearch", "dp1", "dp2", "gridsearch", "graphsearch", "backtrack"] as const;
export type PatternKind = (typeof PATTERN_KINDS)[number];

export type LiveSolver = {
  data: DataKind;
  pattern: PatternKind;
  /** The preset the slots came from, or null once a slot is the user's own. */
  preset: string | null;
  inputs: string[];
  slots: Record<string, string>;
  step: number;
  quiz: boolean;
};

export type SlotId = keyof SolverWords["slots"];
export type OptionId = keyof SolverWords["options"];
/** A slot takes a formula (expr: any value; bool: true or false; list: base cases; text: a name or a position) or a choice. */
export type SlotSpec =
  | { id: SlotId; kind: "expr" | "bool" | "list" | "text"; scope: string[]; default: string }
  | { id: SlotId; kind: "select"; options: OptionId[]; default: OptionId };

export type PatternDef = {
  data: DataKind[];
  slots: SlotSpec[];
  /** The inputs to start from, per kind of data the pattern takes. */
  example: Partial<Record<DataKind, string[]>>;
  run: (env: Env, slots: Record<string, string>, w: SolverWords) => Trace;
};

export type PresetId = keyof SolverWords["presets"];
export type Preset = { data: DataKind; pattern: PatternKind; inputs: string[]; slots: Record<string, string> };

export const LIMITS = { cells: 16, grid: 8, dp2: 13, frames: 300, nodes: 60, candidates: 6, rangeCells: 24, range: 10000 };
