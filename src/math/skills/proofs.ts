// Practice: Proofs. Easy puts a short proof's lines in order (one line looks right but doesn't follow) or gives the
// reason for a marked line; medium does the same with longer proofs (a contradiction, a contrapositive) or finds the
// first wrong line of a faulty proof; hard gives a counterexample to a claim, tested by the claim's own rule, or decides
// a claim true or false, with a counterexample when false. Uses the proof answer kinds of src/math/proofs.ts.
import { fill } from "../chart";
import type { Exercise, Gen, Part, Trap } from "../practiceTypes";
import {
  CLAIM_TEX,
  CLAIMS,
  COUNTER_CLAIMS,
  FLAW_IDS,
  FLAW_TEX,
  FLAWS,
  HOLDS,
  LINE_LETTERS,
  linesText,
  LONG_PROOFS,
  PROOFS,
  REASON_KEYS,
  SHORT_PROOFS,
  type ClaimId,
  type FlawId,
  type ProofId,
  type ProofWords,
} from "../proofs";

type Rng = Parameters<Gen>[0];
const shuffled = <T>(r: Rng, xs: readonly T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The lines of a proof, each with its letter or number in front; one line may be marked. */
function linesPic(claim: string, tags: string[], lines: string[], marked = -1): Exercise["pic"] {
  const H = 24;
  const rows = lines
    .map((l, i) => {
      const y = 34 + i * H;
      const mark = i === marked ? `<rect x="0" y="${y - 16}" width="600" height="${H - 2}" rx="4" fill="#fff3bf"/>` : "";
      return `${mark}<text x="6" y="${y}" font-size="14" font-weight="700" fill="#1971c2">${esc(tags[i])}</text><text x="34" y="${y}" font-size="14" fill="#1e1e1e">${esc(l)}</text>`;
    })
    .join("");
  const svg = `<text x="6" y="12" font-size="13" font-style="italic" fill="#495057">${esc(claim)}</text>${rows}`;
  return { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${svg}</g>`, h: 34 + lines.length * H, w: 600 };
}
const numbers = (n: number) => Array.from({ length: n }, (_, i) => `${i + 1}.`);

/** A proof's lines and the line that doesn't follow, shuffled and lettered; the right order, and the order with the look-alike in. */
export function orderPart(id: ProofId, r: Rng, W: ProofWords): Part {
  const p = W.proofs[id];
  const n = p.lines.length;
  // Places 0..n−1 are the proof's lines in order; n is the look-alike.
  const shown = shuffled(r, Array.from({ length: n + 1 }, (_, i) => i));
  const at = (k: number) => shown.indexOf(k);
  const seq = Array.from({ length: n }, (_, k) => at(k));
  const mimics = PROOFS[id].mimics;
  const slip = seq.map((v, k) => (k === mimics ? at(n) : v));
  const traps: Trap[] = [{ id: "lookAlikeLine", a: { k: "lines", count: n + 1, seq: slip }, vars: { x: LINE_LETTERS[at(n)], y: LINE_LETTERS[at(mimics)] } }];
  return {
    prompt: fill(W.prompt.order, { claim: p.claim }),
    q: "",
    pic: linesPic(p.claim, shown.map((_, i) => `${LINE_LETTERS[i]}`), shown.map((k) => (k === n ? p.wrong : p.lines[k]))),
    answer: { k: "lines", count: n + 1, seq, traps },
    show: `\\text{${linesText(seq)}}`,
    plain: linesText(seq),
    format: "lines",
    steps: [seq.map((i) => `\\text{${LINE_LETTERS[i]}}`).join(" \\to ")],
  };
}

/** Why a marked line of a proof follows: the right reason and three others to choose from. */
export function reasonPart(id: ProofId, r: Rng, W: ProofWords): Part {
  const p = W.proofs[id];
  const m = Math.floor(r.next() * p.lines.length);
  const right = PROOFS[id].reasons[m];
  const keys = shuffled(r, [right, ...shuffled(r, REASON_KEYS.filter((k) => k !== right)).slice(0, 3)]);
  const options = keys.map((k) => ({ text: W.reasons[k], plain: W.reasons[k], tex: `\\text{${W.reasons[k]}}` }));
  return {
    prompt: fill(W.prompt.reason, { m: m + 1 }),
    q: "",
    pic: linesPic(p.claim, numbers(p.lines.length), p.lines, m),
    answer: { k: "pick", options, right: keys.indexOf(right) },
    show: `\\text{${W.reasons[right]}}`,
    plain: W.reasons[right],
    format: "pick",
    steps: [`${m + 1}:\\ \\text{${W.reasons[right]}}`],
  };
}

/** The first wrong line of a faulty proof; a later line, wrong only because of it, is the slip. */
export function flawPart(id: FlawId, W: ProofWords): Part {
  const f = FLAWS[id];
  const lines = W.flaws[id].lines;
  const options = lines.map((_, i) => ({ text: `${i + 1}`, plain: `${i + 1}`, tex: `${i + 1}` }));
  const traps: Trap[] = f.later === null ? [] : [{ id: "laterLine", a: { k: "pick", options, right: f.later }, vars: { x: f.later + 1, v: f.first + 1 } }];
  return {
    prompt: fill(W.prompt.flaw, { claim: W.flaws[id].claim }),
    q: "",
    pic: linesPic(W.flaws[id].claim, numbers(lines.length), lines),
    answer: { k: "pick", options, right: f.first, traps },
    show: `${f.first + 1}`,
    plain: `${f.first + 1}`,
    format: "pick",
    steps: [`${f.first + 1}:\\ ${FLAW_TEX[id]}`],
  };
}

/** A counterexample to a false claim, any that breaks it. */
export function counterPart(id: ClaimId, W: ProofWords): Part {
  const c = CLAIMS[id];
  const held = HOLDS[id];
  const traps: Trap[] = held ? [{ id: "exampleNotCounter", a: held.length === 1 ? { k: "num", v: held[0], tol: 1e-9 } : { k: "tuple", vs: held, tol: 1e-9 }, vars: { x: held.join(", ") } }] : [];
  return {
    prompt: fill(W.prompt.counter, { claim: W.claims[id], typed: W.typed[c.kind] }),
    q: "",
    answer: { k: "counter", claim: id, traps },
    show: CLAIM_TEX[id],
    plain: c.example ?? "",
    format: "counter",
    steps: [CLAIM_TEX[id]],
  };
}

/** A claim decided: true, or false with a counterexample; calling a false one true is the slip. */
export function decidePart(id: ClaimId, W: ProofWords): Part {
  const c = CLAIMS[id];
  const plain = c.truth ? W.true : `${W.false}: ${c.example}`;
  const traps: Trap[] = c.truth ? [] : [{ id: "calledTrue", a: { k: "decide", claim: id, truth: true }, vars: { e: c.example ?? "" } }];
  return {
    prompt: fill(W.prompt.decide, { claim: W.claims[id] }),
    q: "",
    answer: { k: "decide", claim: id, truth: c.truth, traps },
    show: c.truth ? `\\text{${W.true}}` : `\\text{${W.false}}`,
    plain,
    format: "decide",
    steps: [CLAIM_TEX[id]],
  };
}

const gen: Gen = (r, L, w) => {
  const W = w.proofs;
  if (L === 1) return r.next() < 0.5 ? orderPart(r.pick(SHORT_PROOFS), r, W) : reasonPart(r.pick(SHORT_PROOFS), r, W);
  if (L === 2) {
    const k = r.int(0, 2);
    return k === 0 ? orderPart(r.pick(LONG_PROOFS), r, W) : k === 1 ? flawPart(r.pick(FLAW_IDS), W) : reasonPart(r.pick(LONG_PROOFS), r, W);
  }
  return r.next() < 0.5 ? counterPart(r.pick(COUNTER_CLAIMS), W) : decidePart(r.pick(Object.keys(CLAIMS) as ClaimId[]), W);
};

export default gen;
