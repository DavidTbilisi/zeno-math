// The pieces with a "predict, then reveal" (issue #578) and what their change really does, without the pieces
// themselves, so the server can mark a guess (it runs the .ts files as they are, and the pieces' modules import without
// extensions). predict.ts holds the changes; tests/predict.test.ts checks each outcome here against its change played.
export type Change = "up" | "down" | "same";
export const CHANGES: readonly Change[] = ["up", "down", "same"];
export const OUTCOMES = { geoLab: "same", fractionWall: "down", slopeWalk: "down" } as const satisfies Record<string, Change>;
export type PredictKind = keyof typeof OUTCOMES;
export const isPredictKind = (k: string): k is PredictKind => Object.hasOwn(OUTCOMES, k);
