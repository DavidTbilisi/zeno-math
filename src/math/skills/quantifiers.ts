// Practice: Quantifiers. Easy decides "for all x in a small set" or "there is an x" by checking each one ("for all"
// called true because some work, "there is" called false because not all do, named); medium picks the negation of
// "∀x ∃y: …" (a quantifier left as it was named); hard decides a statement where the order of the quantifiers matters
// (the swapped statement's answer named), or picks the negation of the definition of a limit or of continuity (the
// ε–δ form: a kept quantifier or a negated "if … then" named).
import {
  DOMAINS,
  flipQ,
  LIMIT_NEGATIONS,
  option,
  PROPERTIES,
  QTEX,
  QTEXT,
  QUANT_ORDERS,
  RELATIONS2,
  setTex,
  shuffled,
  type LimitNegation,
  type Property,
  type Quant,
  type QuantOrder,
  type Relation2,
} from "../logicSets";
import type { Gen, Part, PracticeWords, Trap } from "../practiceTypes";

type Rng = Parameters<Gen>[0];
const truthOptions = (w: PracticeWords) => [option(w.proofs.true), option(w.proofs.false)];

/** "For all x in D" or "there is an x in D": true or false, checked one by one. */
export function finitePart(prop: Property, D: readonly number[], q: Quant, w: PracticeWords): Part {
  const holds = D.filter(prop.holds);
  const fails = D.filter((x) => !prop.holds(x));
  const v = q === "all" ? fails.length === 0 : holds.length > 0;
  const options = truthOptions(w);
  const traps: Trap[] = [];
  if (q === "all" && !v && holds.length) traps.push({ id: "allFromSome", a: { k: "pick", options, right: 0 }, vars: { x: holds[0], y: fails[0] } });
  if (q === "some" && v && fails.length) traps.push({ id: "existsNeedsAll", a: { k: "pick", options, right: 1 }, vars: { x: holds[0] } });
  const right = v ? 0 : 1;
  return {
    prompt: w.logic.prompt.finite,
    q: `${QTEX[q]} x \\in ${setTex(D)}:\\ ${prop.tex}`,
    answer: { k: "pick", options, right, traps },
    show: `\\text{${options[right].text}}`,
    plain: options[right].plain,
    format: "pick",
    steps: D.map((x) => `x = ${x}:\\ ${prop.at(x)}\\ ${prop.holds(x) ? "\\checkmark" : "\\times"}`),
  };
}

/** The negation of "Q₁x Q₂y: R": each quantifier turned, and R negated. */
export function negatePart(q1: Quant, q2: Quant, rel: Relation2, r: Rng, w: PracticeWords): Part {
  const text = (a: Quant, b: Quant, neg: boolean) => `${QTEXT[a]}x ${QTEXT[b]}y: ${neg ? rel.neg : rel.text}`;
  const tex = (a: Quant, b: Quant, neg: boolean) => `${QTEX[a]} x\\ ${QTEX[b]} y:\\ ${neg ? rel.negTex : rel.tex}`;
  const [n1, n2] = [flipQ(q1), flipQ(q2)];
  const items = shuffled(r, [
    { t: text(n1, n2, true), right: true },
    { t: text(q1, q2, true), trap: "keptQuantifier" as const },
    { t: text(n1, q2, true) },
    { t: text(n1, n2, false) },
  ]);
  const options = items.map((it) => option(it.t, it.t));
  const right = items.findIndex((it) => "right" in it);
  const traps: Trap[] = items.flatMap((it, i) => ("trap" in it && it.trap ? [{ id: it.trap, a: { k: "pick" as const, options, right: i } }] : []));
  return {
    prompt: w.logic.prompt.negate,
    q: tex(q1, q2, false),
    answer: { k: "pick", options, right, traps },
    show: tex(n1, n2, true),
    plain: options[right].plain,
    format: "pick",
    steps: [`\\lnot\\left(${tex(q1, q2, false)}\\right)`, `${QTEX[n1]} x\\ \\lnot\\left(${QTEX[q2]} y:\\ ${rel.tex}\\right)`, tex(n1, n2, true)],
  };
}

/** The negation of the definition of a limit or of continuity. */
export function limitPart(l: LimitNegation, r: Rng, w: PracticeWords): Part {
  const items = shuffled(r, [{ text: l.right, trap: undefined }, ...l.others]);
  const options = items.map((it) => option(it.text, it.text));
  const right = items.findIndex((it) => it.text === l.right);
  const traps: Trap[] = items.flatMap((it, i) => (it.trap ? [{ id: it.trap, a: { k: "pick" as const, options, right: i } }] : []));
  return {
    prompt: w.logic.prompt.negate,
    q: l.tex,
    answer: { k: "pick", options, right, traps },
    show: `\\text{${l.right}}`,
    plain: l.right,
    format: "pick",
    steps: ["\\lnot \\forall \\equiv \\exists \\lnot,\\quad \\lnot \\exists \\equiv \\forall \\lnot,\\quad \\lnot(A \\to B) \\equiv A \\land \\lnot B"],
  };
}

/** A statement with two quantifiers, as given or swapped round: true or false. */
export function orderPart(o: QuantOrder, swapped: boolean, w: PracticeWords): Part {
  const [v, other] = swapped ? [o.swappedTruth, o.truth] : [o.truth, o.swappedTruth];
  const options = truthOptions(w);
  const traps: Trap[] = v === other ? [] : [{ id: "swappedQuantifiers", a: { k: "pick", options, right: other ? 0 : 1 } }];
  const right = v ? 0 : 1;
  return {
    prompt: w.logic.prompt.order,
    q: swapped ? o.swapped : o.tex,
    answer: { k: "pick", options, right, traps },
    show: `\\text{${options[right].text}}`,
    plain: options[right].plain,
    format: "pick",
    steps: [swapped ? o.swappedWhy : o.why],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return finitePart(r.pick(PROPERTIES), r.pick(DOMAINS), r.next() < 0.5 ? "all" : "some", w);
  const q = (): Quant => (r.next() < 0.5 ? "all" : "some");
  if (L === 2) {
    const q1 = q();
    return negatePart(q1, flipQ(q1), r.pick(RELATIONS2), r, w);
  }
  return r.next() < 0.6 ? orderPart(r.pick(QUANT_ORDERS), r.next() < 0.5, w) : limitPart(r.pick(LIMIT_NEGATIONS), r, w);
};

export default gen;
