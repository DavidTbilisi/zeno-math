// Practice: Negative numbers. Easy: sums below and past zero, the sign of a sum without working it out, the missing
// number (−3 + □ = 5), the sum a number line's jump shows, and regrouping (12 − 5 + 8 = 12 + 8 − 5). Medium: taking
// away a negative, temperatures, negative fractions and decimals added and taken away, the minus in a fraction (3/−4),
// substitution, equal expressions and stories of a submarine, a bank balance and a gull above a fish. Hard: × ÷ with
// signs, signed fractions and mixed numbers × ÷, the sign of a product, powers of negatives, and, a new setting, stories
// of a rate of change (a diver, a share price, a leaking tank) (#706).
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { signedLine } from "../signedPics";
import { mi, opt, parTex, parText, pickOf, q, qAbs, qAdd, qDiv, qMul, qNeg, qPar, qPlain, qPow, qSrc, qSub, qTex, qText, qv, word, type Q } from "../signedKit";

const gen: Gen = (r, L, w) => {
  const par = (n: number) => (n < 0 ? `(${n})` : String(n));
  const minus = (n: number) => (n < 0 ? `−${-n}` : String(n));
  /** src: the working as plain text, each number and sign apart, a negative number taken away or added in brackets. */
  const out = (prompt: string, q: string, v: number, steps: string[], src: string, traps: Trap[] = []) => ({
    prompt, q, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number" as const, steps, src,
  });
  if (L === 1) {
    const a = r.int(1, 20);
    const kind = r.int(0, 6);
    if (kind >= 3) return easy(r, kind, w);
    if (kind === 0) {
      // From below zero: −a ± b.
      const b = r.int(2, 20);
      const plus = r.next() < 0.5;
      const q = `${-a} ${plus ? "+" : "-"} ${b}`;
      return out(w.prompts.times, q, plus ? b - a : -a - b, [`${q} = ${plus ? b - a : -a - b}`], q);
    }
    if (kind === 1) {
      // Past zero: a − b with b > a.
      const b = a + r.int(1, 12);
      return out(w.prompts.times, `${a} - ${b}`, a - b, [`${a} - ${b} = -(${b} - ${a}) = ${a - b}`], `${a} - ${b}`);
    }
    const b = r.int(1, 20);
    return out(w.prompts.times, `${a} + (${-b})`, a - b, [`${a} + (${-b}) = ${a} - ${b} = ${a - b}`], `${a} + (${-b})`);
  }
  if (L === 2) {
    const kind = r.int(0, 7);
    if (kind >= 3) return medium(r, kind, w);
    if (kind === 0) {
      const [a, b] = [r.nz(-15, 15), r.int(2, 15)];
      const q = `${a} - (${-b})`;
      return out(w.prompts.times, q, a + b, [`${q} = ${a} + ${b} = ${a + b}`], q, [{ id: "subNeg", a: num(a - b), vars: { b } }]);
    }
    if (kind === 1) {
      const [a, b] = [r.int(-12, 8), r.int(3, 15)];
      const rise = r.next() < 0.5;
      const v = rise ? a + b : a - b;
      return out(fill(rise ? w.prompts.intRise : w.prompts.intFall, { a: minus(a), b }), "", v, [`${a} ${rise ? "+" : "-"} ${b} = ${v}`], `${a} ${rise ? "+" : "-"} ${b}`);
    }
    const [a, b] = [-r.int(2, 15), r.int(1, 20)];
    return out(fill(w.prompts.intDiff, { a: minus(a), b }), "", b - a, [`${b} - (${a}) = ${b} + ${-a} = ${b - a}`], `${b} - (${a})`, [{ id: "subNeg", a: num(b + a), vars: { b: -a } }]);
  }
  const kind = r.int(0, 8);
  if (kind >= 3) return hard(r, kind, w);
  let [a, b] = [r.int(2, 12) * r.sign(), r.int(2, 12) * r.sign()];
  if (a > 0 && b > 0) a = -a;
  if (kind === 0) return out(w.prompts.times, `${a} \\times ${par(b)}`, a * b, [`${a} \\times ${par(b)} = ${a * b}`], `${a} * ${par(b)}`);
  if (kind === 1) return out(w.prompts.times, `${a * b} \\div ${par(b)}`, a, [`${a * b} \\div ${par(b)} = ${a}`], `${a * b} / ${par(b)}`);
  [a, b] = [r.int(2, 9) * r.sign(), r.int(2, 9) * r.sign()];
  const c = r.int(2, 15);
  const q = `${a} \\times ${par(b)} - (${-c})`;
  return out(w.prompts.times, q, a * b + c, [`${q} = ${a * b} + ${c} = ${a * b + c}`], `${a} * ${par(b)} - (${-c})`, [{ id: "subNeg", a: num(a * b - c), vars: { b: c } }]);
};

/** A number answer that may be a fraction: typed as 3/4 or 0.75, shown as a fraction. */
const qAnswer = (prompt: string, qq: string, v: Q, steps: string[], src: string, traps: Trap[] = [], dec = false): Part => ({
  prompt, q: qq, answer: { ...num(qv(v)), traps }, show: qTex(v, dec), plain: qPlain(v, dec), format: "number", steps, src,
});

/** The easy level's new kinds (#706). */
function easy(r: Rng, kind: number, w: PracticeWords): Part {
  const S = w.signed;
  if (kind === 3) {
    // The sign of a sum, without working it out; sometimes decimals, sometimes zero.
    const dec = r.next() < 0.3;
    const size = () => (dec ? r.int(11, 99) / 10 : r.int(2, 30));
    const x = size();
    let y = r.next() < 0.15 ? x : size();
    while (y !== x && Math.abs(y - x) < 1e-9) y = size();
    const [a, b] = r.next() < 0.5 ? [-x, y] : [x, -y];
    const v = Number((a + b).toFixed(6));
    const e = `${a} + ${parTex(b)}`;
    const et = `${mi(a)} + ${parText(b)}`;
    const opts = { pos: word(S.positive), neg: word(S.negative), zero: word(S.zero) };
    const right = v > 0 ? opts.pos : v < 0 ? opts.neg : opts.zero;
    const far = Math.abs(a) > Math.abs(b) ? a : b;
    const slip = v === 0 ? [] : [{ o: v > 0 ? opts.neg : opts.pos, id: "sumSign" as const, vars: { e: et, far: mi(far), v: mi(v) } }];
    const others = [opts.pos, opts.neg, opts.zero].filter((o) => o !== right && !slip.some((t) => t.o === o));
    return pickOf(r, fill(S.signOfSum, { e: et }), right, slip, others, { q: e, steps: [`${e} = ${v}`], src: a < 0 ? `${b} + (${a})` : `${a} + (${b})` });
  }
  if (kind === 4) {
    // The missing number: a + □ = c, □ + a = c or a − □ = c, with negatives.
    const form = r.int(0, 2);
    let a: number, c: number;
    do [a, c] = [r.int(-12, 12), r.int(-12, 12)];
    while (a === 0 || c === 0 || a === c || (a > 0 && c > 0) || Math.abs(c - a) < 2 || a === -c);
    const v = form === 2 ? a - c : c - a;
    const slip = form === 2 ? c - a : c + a;
    const qq = form === 0 ? `${a} + \\square = ${c}` : form === 1 ? `\\square + ${parTex(a)} = ${c}` : `${a} - \\square = ${c}`;
    const work = form === 2 ? `${mi(a)} − ${parText(c)}` : `${mi(c)} − ${parText(a)}`;
    const check = (x: number) => (form === 2 ? `${mi(a)} − ${parText(x)} = ${mi(a - x)}` : form === 1 ? `${parText(x)} + ${parText(a)} = ${mi(a + x)}` : `${mi(a)} + ${parText(x)} = ${mi(a + x)}`);
    const traps: Trap[] = slip !== v ? [{ id: "missingAdd", a: num(slip), vars: { x: mi(slip), check: check(slip), c: mi(c), work, v: mi(v) } }] : [];
    const srcWork = form === 2 ? `${a} - ${parTex(c)}` : `${c} - ${parTex(a)}`;
    return { prompt: S.missing, q: qq, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps: [`\\square = ${work.replace(/−/g, "-")} = ${v}`], src: srcWork };
  }
  if (kind === 5) {
    // The sum a jump on the number line shows.
    let a: number, b: number;
    do [a, b] = [r.int(-8, 5), r.int(-7, 7)];
    while (Math.abs(b) < 2 || a === 0 || a + b === 0 || Math.min(a, a + b) > 0);
    const c = a + b;
    const [lo, hi] = [Math.min(a, c, 0) - 1, Math.max(a, c, 0) + 1];
    const sum = (x: number, y: number) => `${x} ${y < 0 ? "-" : "+"} ${Math.abs(y)} = ${x + y}`;
    const right = opt(sum(a, b));
    const slip = opt(sum(a, -b));
    const others = [opt(sum(-a, b)), opt(sum(c, b))].filter((o) => o.tex !== right.tex && o.tex !== slip.tex);
    return pickOf(r, S.lineSum, right, [{ o: slip, id: "jumpDirection", vars: { a: mi(a), c: mi(c), right: right.text } }], others, {
      pic: signedLine({ lo, hi, d: 1, jump: [a, c] }), steps: [`${a} ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${c}`], src: `${a} ${b < 0 ? "-" : "+"} ${Math.abs(b)}`,
    });
  }
  // Moving the numbers round: a − b + c = a + c − b, each sign going with its number.
  let [a, b, c] = [r.int(2, 15) * (r.next() < 0.4 ? -1 : 1), r.int(2, 12), r.int(2, 12)];
  while (b === c) c = r.int(2, 12);
  const e = `${a} - ${b} + ${c}`;
  const right = opt(`${a} + ${c} - ${b}`);
  const slip = opt(`${a} - ${c} + ${b}`);
  const others = [opt(`${a} - (${b} + ${c})`), opt(`${b} - ${a} + ${c}`)];
  return pickOf(r, fill(S.sameValue, { e: e.replace(/-/g, "−") }), right, [{ o: slip, id: "signStaysWith", vars: { e: e.replace(/-/g, "−"), right: right.text } }], others, {
    // Read as the conceptGraph.ts working does: the minus goes with the 7, a − 7 is a + (−7).
    q: e, steps: [`${e} = ${a} + ${c} - ${b} = ${a - b + c}`], src: `${a} + (-${b}) + ${c}`,
  });
}

/** A fraction or a decimal with a few parts, not whole: bottoms that share a common one, or tenths. */
function part(r: Rng, dec: boolean, bottoms = [2, 3, 4, 6, 8, 12]): Q {
  if (dec) {
    let n: number;
    do n = r.int(1, 49);
    while (n % 10 === 0);
    return q(n, 10);
  }
  const d = r.pick(bottoms);
  let n: number;
  do n = r.int(1, d * 2 - 1);
  while (q(n, d).d === 1);
  return q(n, d);
}

/** The medium level's new kinds (#706). */
function medium(r: Rng, kind: number, w: PracticeWords): Part {
  const S = w.signed;
  if (kind === 3) {
    // Negative fractions or decimals added and taken away.
    const dec = r.next() < 0.4;
    const a = r.next() < 0.5 ? qNeg(part(r, dec)) : part(r, dec);
    let b: Q;
    do b = qNeg(part(r, dec, a.d % 2 === 0 ? [2, 4, 8] : [3, 6]));
    while (qv(b) === qv(a) || qv(b) === -qv(a));
    const minus = r.next() < 0.6;
    const v = minus ? qSub(a, b) : qAdd(a, b);
    const qq = `${qTex(a, dec)} ${minus ? "-" : "+"} ${qPar(b, dec)}`;
    const steps = minus ? [`${qq} = ${qTex(a, dec)} + ${qTex(qNeg(b), dec)}`, `= ${qTex(v, dec)}`] : [`${qq} = ${qTex(a, dec)} - ${qTex(qNeg(b), dec)}`, `= ${qTex(v, dec)}`];
    const traps: Trap[] = minus && qv(qAdd(a, b)) !== qv(v) ? [{ id: "subNeg", a: num(qv(qAdd(a, b))), vars: { b: qText(qNeg(b), dec) } }] : [];
    return qAnswer(w.prompts.times, qq, v, steps, `${qPlain(a, dec)} ${minus ? "-" : "+"} ${qSrc(b, dec)}`, traps, dec);
  }
  if (kind === 4) {
    // Where the minus of a fraction can stand: −3/4 = 3/−4 = −3/4, while −3/−4 = 3/4.
    const letters = r.next() < 0.35;
    let [n, d] = letters ? ["x", "y"] : [String(r.int(2, 8)), String(r.int(2, 9))];
    // In lowest terms, not whole: 3/4, 5/2.
    while (!letters && q(Number(n), Number(d)).d !== Number(d)) [n, d] = [String(r.int(2, 8)), String(r.int(2, 9))];
    const fr = (a: string, b: string) => `\\frac{${a}}{${b}}`;
    const twoNeg = r.next() < 0.3;
    const given = twoNeg ? fr(`-${n}`, `-${d}`) : `-${fr(n, d)}`;
    const right = opt(twoNeg ? fr(n, d) : r.next() < 0.5 ? fr(n, `-${d}`) : fr(`-${n}`, d));
    const slip = opt(twoNeg ? `-${fr(n, d)}` : fr(`-${n}`, `-${d}`));
    const others = [opt(twoNeg ? fr(d, n) : fr(n, d)), opt(twoNeg ? fr(n, `-${d}`) : fr(d, `-${n}`))];
    const pos = opt(fr(n, d)).text;
    // With two minuses given, the slip is −3/4, and a fraction with one minus is negative: −3/4 = 3/−4.
    const vars: Record<string, string> = twoNeg ? { x: opt(given).text, pos, right: `${slip.text} = ${opt(fr(n, `-${d}`)).text}` } : { pos, right: `${opt(given).text} = ${right.text}` };
    const src = letters ? "3 / (-4)" : `${n} / (-${d})`;
    return pickOf(r, fill(S.equalTo, { e: opt(given).text }), right, [{ o: slip, id: "twoMinuses", vars }], others, { q: given, steps: [`${given} = ${right.tex}`], src });
  }
  if (kind === 5) {
    // Substitution: b − a or b − 2a with a below zero.
    const a = -r.int(2, 9);
    const b = r.int(2, 9);
    const k = r.int(1, 2);
    const e = k === 1 ? "b - a" : "b - 2a";
    const v = b - k * a;
    const mid = k === 1 ? `${b} - (${a})` : `${b} - 2 \\times (${a})`;
    return {
      prompt: fill(S.subst, { e: e.replace("-", "−"), a: mi(a), b }), q: e,
      answer: { ...num(v), traps: [{ id: "subNeg", a: num(b + k * a), vars: { b: -k * a } }] }, show: String(v), plain: String(v), format: "number",
      steps: [`${e} = ${mid}`, `= ${b} + ${-k * a} = ${v}`], src: k === 1 ? `${b} - (${a})` : `${b} - 2 * (${a})`,
    };
  }
  if (kind === 6) {
    // The same value as a − (−b): a + b.
    const [a, b] = [r.int(2, 15), r.int(2, 15)];
    const e = `${a} - (-${b})`;
    const right = opt(`${a} + ${b}`);
    const slip = opt(`${a} - ${b}`);
    const others = [opt(`-${a} - ${b}`), opt(`${b} - ${a}`)].filter((o) => o.tex !== slip.tex);
    return pickOf(r, fill(S.sameValue, { e: opt(e).text }), right, [{ o: slip, id: "subNeg", vars: { b } }], others, { q: e, steps: [`${e} = ${a} + ${b} = ${a + b}`], src: `${a} - (-${b})` });
  }
  // Stories: which works out a rise, how far apart a gull and a fish are, a submarine or a bank balance.
  const t = r.int(0, 3);
  if (t === 0) {
    const [a, b] = [-r.int(2, 12), r.int(2, 15)];
    const right = opt(`${b} - (${a})`);
    const slip = opt(`${b} - ${-a}`);
    return pickOf(r, fill(S.riseExpr, { a: mi(a), b }), right, [{ o: slip, id: "subNeg", vars: { b: -a } }], [opt(`${a} - ${b}`)], { steps: [`${b} - (${a}) = ${b} + ${-a} = ${b - a}`], src: `${b} - (${a})` });
  }
  if (t === 1) {
    const b = r.int(2, 12);
    const a = b + r.int(2, 20);
    return {
      prompt: fill(S.apart, { a, b }), q: "", answer: { ...num(a + b), traps: [{ id: "subNeg", a: num(a - b), vars: { b } }] }, show: String(a + b), plain: String(a + b), format: "number",
      steps: [`${a} - (-${b}) = ${a} + ${b} = ${a + b}`], src: `${a} - (-${b})`,
    };
  }
  const sub = t === 2;
  const a = sub ? -r.int(4, 30) * 10 : -r.int(5, 80);
  const b = sub ? r.int(1, 25) * 10 : r.int(5, 120);
  const up = r.next() < 0.6;
  const v = up ? a + b : a - b;
  const prompt = fill(sub ? (up ? S.subUp : S.subDown) : up ? S.payIn : S.payOut, { a: mi(a), b });
  const work = `${mi(a)} ${up ? "+" : "−"} ${b} = ${mi(v)}`;
  return {
    prompt, q: "", answer: { ...num(v), traps: [{ id: "riseAdds", a: num(up ? a - b : a + b), vars: { work } }] }, show: String(v), plain: String(v), format: "number",
    steps: [`${a} ${up ? "+" : "-"} ${b} = ${v}`], src: `${a} ${up ? "+" : "-"} ${b}`,
  };
}

/** The sign slip of a product or quotient: unlike signs answered plus, like signs answered minus. */
const signTrap = (a: number, b: number, wrong: number, work: string): Trap => ({ id: a < 0 && b < 0 ? "likeSigns" : "unlikeSigns", a: num(wrong), vars: { work } });

/** The hard level's new kinds (#706). */
function hard(r: Rng, kind: number, w: PracticeWords): Part {
  const S = w.signed;
  if (kind === 3) {
    // Signed fractions × or ÷.
    let a: Q, b: Q;
    do [a, b] = [part(r, false, [2, 3, 4, 5, 6, 8, 9]), part(r, false, [2, 3, 4, 5, 6, 8, 9])];
    while (qv(a) === qv(b));
    const s = r.int(0, 2);
    if (s !== 1) a = qNeg(a);
    if (s !== 0) b = qNeg(b);
    const times = r.next() < 0.5;
    const v = times ? qMul(a, b) : qDiv(a, b);
    const op = times ? "\\times" : "\\div";
    const qq = `${qTex(a)} ${op} ${qPar(b)}`;
    const size = `${qText(qAbs(a))} ${times ? "×" : "÷"} ${qText(qAbs(b))} = ${qText(qAbs(v))}`;
    const steps = [times ? `${qq} = ${qTex(v)}` : `${qq} = ${qTex(a)} \\times ${qPar(q(b.d, b.n))} = ${qTex(v)}`];
    return qAnswer(w.prompts.times, qq, v, steps, `${qPlain(a)} ${times ? "*" : "/"} ${qSrc(b)}`, [signTrap(qv(a), qv(b), -qv(v), `${size}, ${qText(v)}`)]);
  }
  if (kind === 4) {
    // A mixed number with a minus ÷ a fraction (or a mixed number).
    const [wh, n, d] = [r.int(1, 3), 0, r.pick([2, 3, 4])];
    const top = r.int(1, d - 1) + n;
    const a = qNeg(q(wh * d + top, d));
    let b = part(r, false, [2, 3, 4, 6]);
    if (r.next() < 0.4) b = qNeg(b);
    const v = qDiv(a, b);
    const mixed = `-${wh}\\tfrac{${top}}{${d}}`;
    const qq = `${mixed} \\div ${qPar(b)}`;
    const work = `${qText(a)} × ${qText(q(b.d, b.n))} = ${qText(v)}`;
    return qAnswer(w.prompts.times, qq, v, [`${mixed} = ${qTex(a)}`, `${qTex(a)} \\div ${qPar(b)} = ${qTex(a)} \\times ${qPar(q(b.d, b.n))} = ${qTex(v)}`], `${qPlain(a)} / ${qSrc(b)}`, [signTrap(qv(a), qv(b), -qv(v), work)]);
  }
  if (kind === 5) {
    // The sign of a product of several numbers, a power of a negative among them in the challenge.
    const k = r.int(3, 5);
    const nums = Array.from({ length: k }, () => r.int(1, 9) * (r.next() < 0.55 ? -1 : 1));
    if (!nums.some((x) => x < 0)) nums[0] = -nums[0];
    const power = r.next() < 0.35 ? r.int(2, 3) : 0;
    if (power && nums[0] > 0) nums[0] = -nums[0];
    const negs = nums.filter((x) => x < 0).length + (power && nums[0] < 0 ? power - 1 : 0);
    const e = nums.map((x, i) => (i === 0 && power ? `(${x})^{${power}}` : parTex(x))).join(" \\times ");
    const et = nums.map((x, i) => (i === 0 && power ? `(${mi(x)})${power === 2 ? "²" : "³"}` : parText(x))).join(" × ");
    const pos = negs % 2 === 0;
    const [P, N] = [word(S.positive), word(S.negative)];
    // Only the signs are asked for, not the product: the working conceptGraph.ts reads has each factor as 1 or −1.
    const src = nums.map((x, i) => { const u = Math.sign(x) || 1; return i === 0 && power ? `(${u}) ^ ${power}` : i === 0 ? String(u) : parTex(u); }).join(" * ");
    return pickOf(r, fill(S.signOfProduct, { e: et }), pos ? P : N, [{ o: pos ? N : P, id: "signCount", vars: { k: negs, s: pos ? S.positive : S.negative } }], [], { q: e, steps: [`${e} = ${nums.reduce((t, x, i) => t * (i === 0 && power ? x ** power : x), 1)}`], src });
  }
  if (kind === 6) {
    // A power of a negative number or a negative fraction.
    const frac = r.next() < 0.4;
    const base = frac ? qNeg(part(r, false, [2, 3, 4, 5])) : q(-r.int(2, 5));
    const k = frac ? r.int(2, 3) : r.int(2, qv(base) < -3 ? 3 : 4);
    const v = qPow(base, k);
    const e = `\\left(${qTex(base)}\\right)^{${k}}`;
    const et = `(${qText(base)})${["", "", "²", "³", "⁴"][k]}`;
    const work = Array.from({ length: k }, () => `(${qText(base)})`).join(" × ");
    return qAnswer(w.prompts.times, e, v, [`${e} = ${Array.from({ length: k }, () => qPar(base)).join(" \\times ")} = ${qTex(v)}`], `(${qPlain(base)}) ^ ${k}`, [
      { id: "negBasePower", a: num(-qv(v)), vars: { e: et, work, v: qText(v) } },
    ]);
  }
  if (kind === 7) {
    // The same value as a signed × or ÷.
    const [x, y] = [r.int(2, 9), r.int(2, 9)];
    if (r.next() < 0.5) {
      const e = `-${x * y} \\div (-${y})`;
      const right = opt(`${x * y} \\div ${y}`);
      const slip = opt(`-(${x * y} \\div ${y})`);
      return pickOf(r, fill(S.sameValue, { e: opt(e).text }), right, [{ o: slip, id: "likeSigns", vars: { work: `${opt(e).text} = ${x * y} ÷ ${y} = ${x}` } }], [opt(`${y} \\div ${x * y}`)], {
        q: e, steps: [`${e} = ${x * y} \\div ${y} = ${x}`], src: `-${x * y} / (-${y})`,
      });
    }
    const e = `-${x} \\times ${y}`;
    const right = opt(`-(${x} \\times ${y})`);
    const slip = opt(`${x} \\times ${y}`);
    return pickOf(r, fill(S.sameValue, { e: opt(e).text }), right, [{ o: slip, id: "unlikeSigns", vars: { work: `${opt(e).text} = −(${x} × ${y}) = −${x * y}` } }], [opt(`(-${x}) \\times (-${y})`)], {
      q: e, steps: [`${e} = -(${x} \\times ${y}) = -${x * y}`], src: `-${x} * ${y}`,
    });
  }
  // A new setting: a rate of change, as a story (a diver, a share price, a leaking tank).
  const t = r.int(0, 2);
  const n = r.int(3, 9);
  if (t === 0) {
    const a = r.pick([1.5, 2, 2.5, 3, 4, 5]);
    const v = -a * n;
    return {
      prompt: fill(S.diver, { a, n }), q: "", answer: { ...num(v), traps: [signTrap(-a, n, -v, `−${a} × ${n} = ${mi(v)}`)] }, show: String(v), plain: String(v), format: "number",
      steps: [`-${a} \\times ${n} = ${v}`], src: `-${a} * ${n}`,
    };
  }
  if (t === 1) {
    const each = r.pick([0.5, 1.5, 2, 3, 4, 6]);
    const total = each * n;
    return {
      prompt: fill(S.share, { n, t: total }), q: "", answer: { ...num(-each), traps: [signTrap(-total, n, each, `−${total} ÷ ${n} = −${each}`)] }, show: String(-each), plain: String(-each), format: "number",
      steps: [`-${total} \\div ${n} = -${each}`], src: `-${total} / ${n}`,
    };
  }
  const f = r.pick([q(1, 2), q(1, 4), q(3, 4), q(2, 3), q(1, 3)]);
  const v = qMul(qNeg(f), q(n));
  return qAnswer(fill(S.tank, { f: qText(f), n }), "", v, [`${qTex(qNeg(f))} \\times ${n} = ${qTex(v)}`], `${qPlain(qNeg(f))} * ${n}`, [signTrap(-qv(f), n, -qv(v), `−${qText(f)} × ${n} = ${qText(v)}`)]);
}

export default gen;
