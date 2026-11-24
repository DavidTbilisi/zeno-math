// Marking a word problem before solving it (issue #582): the student taps each sentence and marks it given, asked,
// not needed or relation, and on a relation says whose amount is bigger. By keyboard: the arrows to a sentence, 1–4
// for the marks (a relation then asks whose amount, by Tab and Enter or the arrows). Each mark moves on to the next
// sentence not yet marked. Once every sentence has a mark the student checks them: one wrong mark is pointed out
// (the first), with what it should be and why, and the marks stay on the sentences while the problem is solved.
import { useRef, useState } from "react";
import { fill } from "../math/text";
import { firstWrong, MARKS, type Mark, type MarkedSentence, type MarkPick } from "../math/wordMarks";
import type { MarkWords } from "../math/practiceTypes";
import { Sentences } from "./Sentences";

type Props = {
  sentences: readonly MarkedSentence[];
  w: MarkWords;
  /** Every sentence marked and checked: the student's picks, and the sentence pointed out (-1: all right). */
  onChecked: (picks: MarkPick[], wrong: number) => void;
};

export function MarkProblem({ sentences, w, onChecked }: Props) {
  const [picks, setPicks] = useState<(MarkPick | undefined)[]>(() => sentences.map(() => undefined));
  const [active, setActive] = useState(0);
  /** null until checked; then the sentence pointed out, or -1. */
  const [wrong, setWrong] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  // Whose amount is bigger is asked on any relation, the sentence's own two people, or else the problem's first pair,
  // so the question itself doesn't tell a relation from the rest. A problem without people (proportion) doesn't ask.
  const anyPair = sentences.find((s) => s.compare)?.compare?.who;
  const pairOf = (i: number) => sentences[i].compare?.who ?? anyPair;
  const complete = (p: MarkPick | undefined, i: number) => !!p && (p.mark !== "relation" || !pairOf(i) || p.bigger !== undefined);
  const allMarked = sentences.every((_, i) => complete(picks[i], i));
  const pickAt = picks[active];

  const focusAt = (sel: string, i = 0) => setTimeout(() => box.current?.querySelectorAll<HTMLElement>(sel)[i]?.focus());
  /** On to the next sentence not marked yet after `from`, or to Check once all are. */
  const onward = (next: (MarkPick | undefined)[], from: number, keyed: boolean) => {
    const n = sentences.length;
    const to = Array.from({ length: n }, (_, k) => (from + 1 + k) % n).find((i) => !complete(next[i], i));
    if (to === undefined) {
      if (keyed) setTimeout(() => checkRef.current?.focus());
      return;
    }
    setActive(to);
    if (keyed) focusAt(".sentence", to);
  };
  const set = (i: number, p: MarkPick, keyed: boolean) => {
    const next = picks.map((x, k) => (k === i ? p : x));
    setPicks(next);
    if (complete(p, i)) onward(next, i, keyed);
    // A relation asks whose amount is bigger next.
    else if (keyed) focusAt(".mark-bigger button");
  };
  const choose = (m: Mark, keyed = false) => set(active, { mark: m }, keyed);
  const check = () => {
    const at = firstWrong(sentences, picks);
    setWrong(at);
    onChecked(picks as MarkPick[], at);
  };

  const tagOf = (i: number) => {
    const p = picks[i];
    if (!p) return null;
    const who = p.mark === "relation" && p.bigger !== undefined ? pairOf(i)?.[p.bigger] : undefined;
    return { tone: `mark-${p.mark}`, label: who ? fill(w.biggerTag, { who }) : w.name[p.mark] };
  };
  const pointed = wrong !== null && wrong >= 0 ? sentences[wrong] : null;
  const message = wrong === null ? null
    : !pointed ? w.allRight
    : fill(w.wrong, { mark: w.name[pointed.mark], why: fill(w.why[pointed.mark], { who: pointed.compare?.who[pointed.compare.bigger] ?? "" }) });
  const pair = pickAt?.mark === "relation" ? pairOf(active) : undefined;

  return (
    <div className="mark-problem" ref={box}>
      {wrong === null && <p className="hint mark-intro">{w.intro}</p>}
      <Sentences
        sentences={sentences.map((s) => s.text)}
        active={active}
        onActive={setActive}
        tag={tagOf}
        pointed={wrong ?? undefined}
        disabled={wrong !== null}
        label={w.sentences}
        onKey={(i, key) => {
          const k = Number(key);
          if (!Number.isInteger(k) || k < 1 || k > MARKS.length) return false;
          set(i, { mark: MARKS[k - 1] }, true);
          return true;
        }}
      />
      {wrong === null ? (
        <>
          <div className="mark-picks" role="group" aria-label={w.marks}>
            {MARKS.map((m, k) => (
              <button key={m} type="button" className={`btn small mark-pick mark-${m}`} aria-pressed={pickAt?.mark === m} onClick={() => choose(m)}>
                <kbd>{k + 1}</kbd> {w.name[m]}
              </button>
            ))}
          </div>
          {pair && (
            <div className="mark-bigger" role="group" aria-label={w.bigger}>
              <span>{w.bigger}</span>
              {pair.map((name, b) => (
                <button
                  key={b}
                  type="button"
                  className="btn small"
                  aria-pressed={pickAt?.bigger === b}
                  onClick={(e) => set(active, { mark: "relation", bigger: b as 0 | 1 }, e.detail === 0)}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                    e.preventDefault();
                    focusAt(".mark-bigger button", 1 - b);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <div className="field-row wrap">
            <button ref={checkRef} type="button" className="btn primary" disabled={!allMarked} onClick={check}>{w.check}</button>
            <small className="hint mark-keys">{w.keys}</small>
          </div>
        </>
      ) : (
        <div className={`practice-verdict ${pointed ? "close" : "ok"}`} role="status">{message}</div>
      )}
    </div>
  );
}
