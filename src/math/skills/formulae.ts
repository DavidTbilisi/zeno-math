// Practice: Formulae and changing the subject.
import { fill } from "../chart";
import { parseE } from "../expr";
import { formulaQuestion } from "../formulae";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Substitute into a formula, or make a letter its subject: one step (easy), two (medium), a squared or rooted
  // subject or one that appears twice (hard) (src/math/formulae.ts).
  const q = formulaQuestion(r.next, L);
  if (q.kind === "substitute")
    return { prompt: fill(w.formulae.substitute, q.vars), q: q.q, answer: num(q.v!), show: `${q.vars.s} = ${q.show}`, plain: q.ans, format: "number", steps: q.steps };
  const vars = q.letters.filter((l) => l !== q.vars.s);
  return {
    prompt: fill(w.formulae.subject, q.vars),
    q: q.q,
    answer: { k: "expr", e: parseE(q.ans, vars), vars, traps: q.traps.map((t) => ({ id: t.id, a: { k: "expr", e: parseE(t.e, vars), vars }, vars: t.vars })) },
    show: q.show,
    plain: q.ans,
    format: "formula",
    steps: q.steps,
  };
};

export default gen;
