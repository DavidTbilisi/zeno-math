// Marking a word problem before it is solved (issue #582): the problem in its sentences, each with the mark that
// follows from the problem's structure. A sentence that asks the question is "asked"; one that compares two people's
// amounts ("d more than", "k times as much") is a "relation", and its mark also says whose amount is bigger; one that
// names numbers is "given" when the answer uses one of them and "not needed" when it uses none (the noise sentence).
// Whether the answer uses a number is read off the structure's own working: the answer worked again with that number
// changed comes out different. So nothing is written per problem: a generator says what each of its sentences does
// (its clauses), and the marks come from the numbers.
//
// The student marks each sentence by tapping it and a mark (or by keyboard: an arrow to a sentence, a key per mark),
// one wrong mark is pointed out, and solving begins as before (MarkProblem.tsx). The marks are recorded with the
// attempt and move nothing in the learner model.

export type Mark = "given" | "asked" | "notNeeded" | "relation";
export const MARKS: readonly Mark[] = ["given", "asked", "notNeeded", "relation"];

/**
 * What a sentence does in the problem's structure: names some of its numbers (`says`, keys of its numbers), compares
 * the amounts of two people (`compares`, keys of their amounts), or asks the question (`asks`, which may name a number too).
 */
export type Clause = { says?: readonly string[]; compares?: readonly [string, string]; asks?: true };

/** One sentence as the student reads it, with its right mark; on a relation, the two people and whose amount is bigger. */
export type MarkedSentence = { text: string; mark: Mark; compare?: { who: [string, string]; bigger: 0 | 1 } };

/** A student's mark on a sentence: on a relation, also whose amount they picked as bigger. */
export type MarkPick = { mark: Mark; bigger?: 0 | 1 };

/** Whether the answer worked out by `answer` changes when the number `key` does: then the answer uses it. */
export function usesOf(answer: (vars: Record<string, number>) => number, vars: Record<string, number>): (key: string) => boolean {
  const v = answer(vars);
  return (key) => key in vars && [1, 2].some((d) => Math.abs(answer({ ...vars, [key]: vars[key] + d }) - v) > 1e-9);
}

/** The right mark of a clause: asking, comparing, then naming numbers the answer uses or not. */
export function markOf(c: Clause, uses: (key: string) => boolean): Mark {
  if (c.asks) return "asked";
  if (c.compares) return "relation";
  return (c.says ?? []).some(uses) ? "given" : "notNeeded";
}

/**
 * The sentences, each with its mark from its clause. `amounts` are the people's amounts a relation compares, and
 * `names` what the student is shown for each; the two are shown in an order that follows from the numbers, so that
 * the bigger is not always the first.
 */
export function markSentences(
  clauses: readonly Clause[],
  texts: readonly string[],
  uses: (key: string) => boolean,
  amounts: Record<string, number> = {},
  names: Record<string, string> = {},
): MarkedSentence[] {
  if (clauses.length !== texts.length) throw new Error(`${texts.length} sentences for ${clauses.length} clauses`);
  const flip = Object.values(amounts).reduce((s, v) => s + Math.round(v), 0) % 2 === 1;
  return clauses.map((c, i) => {
    const mark = markOf(c, uses);
    if (!c.compares) return { text: texts[i], mark };
    const [p, q] = flip ? [c.compares[1], c.compares[0]] : c.compares;
    if (amounts[p] === amounts[q]) throw new Error(`a relation between equal amounts: ${p}, ${q}`);
    return { text: texts[i], mark, compare: { who: [names[p] ?? p, names[q] ?? q], bigger: amounts[p] > amounts[q] ? 0 : 1 } };
  });
}

/** The problem as one text, as it is shown once marked: its sentences in order. */
export const textOf = (sentences: readonly { text: string }[]) => sentences.map((s) => s.text).join(" ");

/** Whether a pick is the sentence's right mark (a relation's with the bigger amount right too). */
export const pickRight = (s: MarkedSentence, p: MarkPick | undefined): boolean =>
  !!p && p.mark === s.mark && (s.mark !== "relation" || p.bigger === s.compare?.bigger);

/** The first sentence marked wrong, or -1 when every one is right. */
export const firstWrong = (sentences: readonly MarkedSentence[], picks: readonly (MarkPick | undefined)[]): number =>
  sentences.findIndex((s, i) => !pickRight(s, picks[i]));

/** A pick as the attempt records it: the mark, and on a relation whose amount was picked ("relation:0"). */
export const pickCode = (p: MarkPick): string => (p.mark === "relation" ? `relation:${p.bigger ?? 0}` : p.mark);
/** Every code a pick can be recorded as. */
export const PICK_CODES: readonly string[] = ["given", "asked", "notNeeded", "relation:0", "relation:1"];
