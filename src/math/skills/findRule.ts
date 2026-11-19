// Practice: Find the rule.
import { fill } from "../chart";
import { machineAnswer, ruleQuestion, ruleSteps, ruleTable, scaledOutput, undoOrder } from "../machine";
import { num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // A machine's rule from four pairs (src/math/machine.ts): what comes out for a bigger number, or what went in.
  const q = ruleQuestion(L, r.next);
  const v = machineAnswer(q);
  const traps: Trap[] = [];
  const scaled = scaledOutput(q);
  if (scaled) traps.push({ id: "scaledOutput", a: num(scaled.v), vars: { k: scaled.k, o: scaled.o } });
  const back = undoOrder(q);
  // Named only when the machine adds: "take −4 away first" would say it worse than the steps do.
  if (back !== null && q.rule.add > 0 && q.ask.dir === "in")
    traps.push({ id: "undoOrder", a: num(back), vars: { rule: `${q.rule.mul}n + ${q.rule.add}`, a: q.rule.add, out: q.ask.out, r: q.ask.out - q.rule.add, m: q.rule.mul } });
  return {
    prompt: q.ask.dir === "out" ? fill(w.prompts.findRuleOut, { n: q.ask.n }) : fill(w.prompts.findRuleIn, { out: q.ask.out }),
    q: ruleTable(q),
    answer: { ...num(v), traps },
    show: q.ask.dir === "out" ? `${q.ask.n} \\mapsto ${v}` : `${v} \\mapsto ${q.ask.out}`,
    plain: String(v),
    format: "number",
    steps: ruleSteps(q),
  };
};

export default gen;
