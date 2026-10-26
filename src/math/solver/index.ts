// The algorithm solver: a kind of data, a pattern (a skeleton that knows how to run and how to draw itself) and the
// formulas in its slots, run into frames for the live piece to step through. Presets fill the slots for well-known
// problems. Kept free of React so it can be tested on its own.
import type { Trace } from "../patternSteps";
import { DATA } from "./data";
import { backtrack } from "./patterns/backtrack";
import { bsearch } from "./patterns/bsearch";
import { dp1 } from "./patterns/dp1";
import { dp2 } from "./patterns/dp2";
import { graphsearch } from "./patterns/graphsearch";
import { gridsearch } from "./patterns/gridsearch";
import { mono } from "./patterns/mono";
import { twoptr } from "./patterns/twoptr";
import { window } from "./patterns/window";
import { isPresetId, PRESET_IDS, PRESETS } from "./presets";
import { DATA_KINDS, PATTERN_KINDS, type DataKind, type LiveSolver, type PatternDef, type PatternKind, type PresetId, type SolverWords } from "./types";

export { DATA, PRESET_IDS, PRESETS, isPresetId, DATA_KINDS, PATTERN_KINDS };
export type { DataKind, LiveSolver, PatternKind, PresetId, SolverWords };

export const PATTERNS: Record<PatternKind, PatternDef> = { window, twoptr, mono, bsearch, dp1, dp2, gridsearch, graphsearch, backtrack };

export const isDataKind = (k: unknown): k is DataKind => typeof k === "string" && (DATA_KINDS as readonly string[]).includes(k);
export const isPatternKind = (k: unknown): k is PatternKind => typeof k === "string" && (PATTERN_KINDS as readonly string[]).includes(k);

/** The patterns that take this kind of data, and the presets for a pair. */
export const patternsFor = (data: DataKind): PatternKind[] => PATTERN_KINDS.filter((p) => PATTERNS[p].data.includes(data));
export const presetsFor = (data: DataKind, pattern: PatternKind): PresetId[] => PRESET_IDS.filter((id) => PRESETS[id].data === data && PRESETS[id].pattern === pattern);

/** Every slot's starting formula or choice. */
export const slotDefaults = (pattern: PatternKind): Record<string, string> => Object.fromEntries(PATTERNS[pattern].slots.map((s) => [s.id, s.default]));

/** The state a preset puts the piece in. */
export const fromPreset = (id: PresetId): LiveSolver => {
  const p = PRESETS[id];
  return { data: p.data, pattern: p.pattern, preset: id, inputs: [...p.inputs], slots: { ...slotDefaults(p.pattern), ...p.slots }, step: 0, quiz: false };
};
/** The state for a kind of data and a pattern with no preset: the pattern's example and its default slots. */
export const fromPair = (data: DataKind, pattern: PatternKind): LiveSolver => {
  const first = presetsFor(data, pattern)[0];
  if (first) return fromPreset(first);
  return { data, pattern, preset: null, inputs: [...(PATTERNS[pattern].example[data] ?? [])], slots: slotDefaults(pattern), step: 0, quiz: false };
};

export const SOLVER_START: LiveSolver = fromPreset("twoSumSorted");

/** A saved state made whole again: an unknown kind or pattern goes back to the start, a gone preset becomes "your own". */
export function mendSolver(s: LiveSolver): LiveSolver {
  if (!isDataKind(s.data) || !isPatternKind(s.pattern) || !PATTERNS[s.pattern].data.includes(s.data)) return SOLVER_START;
  return { ...s, preset: isPresetId(s.preset) ? s.preset : null, slots: { ...slotDefaults(s.pattern), ...(s.slots ?? {}) }, inputs: s.inputs ?? [] };
}

/** The frames of a run; what cannot be read or run throws with a message that says why. */
export function solverTrace(state: LiveSolver, w: SolverWords): Trace {
  const def = PATTERNS[state.pattern];
  const fields = DATA[state.data].fields;
  const inputs = fields.map((_, i) => state.inputs[i] ?? "");
  const env = DATA[state.data].read(inputs, w.errors);
  return def.run(env, { ...slotDefaults(state.pattern), ...state.slots }, w);
}
