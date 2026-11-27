// Practice: Differentiation. Since #745 half the seeds ask about the rules themselves: a sum's derivative from a
// table, the error in a power-rule working, which two functions make a composite (L1); the product, quotient and
// chain rules from a table, aˣ and logₐ x, and a quotient or product tidied before differentiating (L2); tan, cot,
// sec and csc, a second derivative, and the error in a product, quotient or chain-rule working (L3).
import { diffParts } from "../calcSteps";
import { exact, F } from "../calculusTwo";
import { C, fill } from "../chart";
import { derive } from "../derive";
import { type E, parseE, simp, tex } from "../expr";
import { minus } from "../logicSets";
import { exprPart, plainE, polyStr } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { pickPart } from "../tTails";

const font = `font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif"`;
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const pw = (n: number) => String(n).split("").map((d) => SUP[Number(d)]).join("");
const sub = (n: number) => String(n).split("").map((d) => SUB[Number(d)]).join("");
const plusW = (c: number, v = "") => (c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}${v}`);
const coefW = (k: number) => (k === 1 ? "" : k === -1 ? "−" : minus(k));

/** A table of x and the values of f, f′, g and g′ there. */
function rulesTable(rows: number[][]) {
  const head = ["x", "f(x)", "f′(x)", "g(x)", "g′(x)"];
  const cw = 60;
  const out: string[] = [];
  [head, ...rows.map((row) => row.map(minus))].forEach((cells, i) =>
    cells.forEach((c, j) => {
      out.push(`<rect x="${j * cw}" y="${i * 32}" width="${cw}" height="32" fill="${i === 0 || j === 0 ? "#e7f5ff" : "#fff"}" stroke="${C.grey}"/>`);
      out.push(`<text x="${j * cw + cw / 2}" y="${i * 32 + 21}" font-size="15" text-anchor="middle" ${font} fill="${C.ink}"${i === 0 || j === 0 ? ' font-weight="700"' : ""}>${c}</text>`);
    }));
  const body = out.join("");
  return { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`, w: head.length * cw + 2, h: (rows.length + 1) * 32 + 2 };
}

/** The rules themselves (#745), on half the seeds. */
function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.dvK;
  if (L === 1) {
    const t = r.pick(["table", "error", "composite"] as const);
    if (t === "table") {
      const rows = [1, 2, 3].map((x) => [x, r.int(-5, 6), r.int(-4, 5), r.int(-5, 6), r.int(-4, 5)]);
      const a = r.int(1, 3);
      const [, f, df, g, dg] = rows[a - 1];
      const [p, q] = [r.nz(-4, 4), r.nz(-4, 4)];
      const v = p * df + q * dg;
      return {
        prompt: fill(K.ruleTableQ, { h: `${coefW(p)}f(x)${plusW(q, "g(x)")}`.replace(/ 1g/, " g"), a }), q: "",
        ...exact(F(v), [["valuesNotDerivatives", F(p * f + q * g)]]),
        steps: [`h'(${a}) = ${p === 1 ? "" : p === -1 ? "-" : p}f'(${a}) ${q < 0 ? "-" : "+"} ${Math.abs(q) === 1 ? "" : Math.abs(q)}g'(${a}) = ${p} \\cdot ${df < 0 ? `(${df})` : df} ${q < 0 ? "-" : "+"} ${Math.abs(q)} \\cdot ${dg < 0 ? `(${dg})` : dg} = ${v}`],
        pic: rulesTable(rows),
      };
    }
    if (t === "error") {
      const [n, a, b, c] = [r.int(3, 5), r.int(2, 5), r.int(1, 9), r.int(1, 9)];
      const kind = r.int(0, 3);
      const claim = [`${a * n}x^{${n}} + ${b}`, `${a * n}x^{${n - 1}} + ${b} + ${c}`, `${n}x^{${n - 1}} + ${b}`, `${a * n}x^{${n - 1}} + ${b}`][kind];
      const part = pickPart(r, [K.eLower, K.eConst, K.eCoef, K.eNone], kind, [{ id: "errorNotSeen", at: 3 }], K.errorQ, [`f'(x) = ${a} \\cdot ${n}x^{${n - 1}} + ${b} = ${a * n}x^{${n - 1}} + ${b}`]);
      return { ...part, q: `f(x) = ${a}x^{${n}} + ${b}x + ${c}, \\quad f'(x) = ${claim}` };
    }
    const [p, q, n] = [r.int(2, 5), r.nz(-6, 6), r.int(2, 5)];
    const G = `${p}x${plusW(q)}`;
    const Gt = `${p}x ${q < 0 ? "-" : "+"} ${Math.abs(q)}`;
    const [Fw, h] = r.pick([["√x", `\\sqrt{${Gt}}`], [`x${pw(n)}`, `(${Gt})^{${n}}`], ["sin x", `\\sin(${Gt})`], ["eˣ", `e^{${Gt}}`]] as const);
    const opts = [`h = f(g(x)); f(x) = ${Fw}; g(x) = ${G}`, `h = f(g(x)); f(x) = ${G}; g(x) = ${Fw}`, `h = f(x) · g(x); f(x) = ${Fw}; g(x) = ${G}`];
    return { ...pickPart(r, opts, 0, [{ id: "compositeLayersSwapped", at: 1 }, { id: "compositeReadAsProduct", at: 2 }], K.compQ, [`g(x) = ${Gt}, \\quad f(g(x)) = ${h}`]), q: `h(x) = ${h}` };
  }
  if (L === 2) {
    const t = r.pick(["product", "quotient", "chain", "expLog", "tidy"] as const);
    if (t === "product" || t === "quotient" || t === "chain") {
      const a = r.int(1, 3);
      const rows = [1, 2, 3].map((x) => [x, r.int(-5, 6), r.int(-4, 5), t === "chain" ? r.int(1, 3) : r.pick([-3, -2, -1, 1, 2, 3, 4, 5]), r.int(-4, 5)]);
      if (t === "chain") while (rows[a - 1][3] === a) rows[a - 1][3] = r.int(1, 3);
      const [, f, df, g, dg] = rows[a - 1];
      const par = (v: number) => (v < 0 ? `(${v})` : String(v));
      if (t === "product") {
        const v = df * g + f * dg;
        return {
          prompt: fill(K.ruleTableQ, { h: "f(x) · g(x)", a }), q: "", pic: rulesTable(rows),
          ...exact(F(v), [["derivativesMultiplied", F(df * dg)]]),
          steps: [`h'(${a}) = f'(${a})g(${a}) + f(${a})g'(${a}) = ${par(df)} \\cdot ${par(g)} + ${par(f)} \\cdot ${par(dg)} = ${v}`],
        };
      }
      if (t === "quotient") {
        const top = df * g - f * dg;
        const v = F(top, g * g);
        return {
          prompt: fill(K.ruleTableQ, { h: "f(x) ÷ g(x)", a }), q: "", pic: rulesTable(rows),
          ...exact(v, [["quotientTopSwapped", F(-top, g * g)], ["quotientNotSquared", F(top, g), { g: minus(g), g2: g * g }]]),
          steps: [`h'(${a}) = \\frac{f'(${a})g(${a}) - f(${a})g'(${a})}{g(${a})^{2}} = \\frac{${par(df)} \\cdot ${par(g)} - ${par(f)} \\cdot ${par(dg)}}{${par(g)}^{2}} = ${v.tex()}`],
        };
      }
      const dfb = rows[g - 1][2];
      const v = dfb * dg;
      return {
        prompt: fill(K.ruleTableQ, { h: "f(g(x))", a }), q: "", pic: rulesTable(rows),
        ...exact(F(v), [["chainOuterAtPoint", F(df * dg), { a, b: g }], ["chainInsideLost", F(dfb), { k: minus(dg), u: "g(x)" }]]),
        steps: [`g(${a}) = ${g}`, `h'(${a}) = f'(g(${a}))\\,g'(${a}) = f'(${g}) \\cdot ${par(dg)} = ${par(dfb)} \\cdot ${par(dg)} = ${v}`],
      };
    }
    if (t === "expLog") {
      const a = r.pick([2, 3, 5, 10]);
      if (r.next() < 0.5)
        return pickPart(r, [`${a}ˣ · ln ${a}`, `x · ${a}ˣ⁻¹`, `${a}ˣ`, `${a}ˣ ÷ ln ${a}`], 0,
          [{ id: "powerRuleOnExponential", at: 1, vars: { a } }, { id: "lnFactorLost", at: 2, vars: { a } }, { id: "lnFactorInverted", at: 3, vars: { a } }], fill(K.whichQ, { f: `${a}ˣ` }),
          [`${a}^{x} = e^{x \\ln ${a}}`, `\\frac{d}{dx}${a}^{x} = ${a}^{x} \\ln ${a}`]);
      return pickPart(r, [`1 ÷ (x · ln ${a})`, `1 ÷ x`, `ln ${a} ÷ x`], 0, [{ id: "lnFactorLost", at: 1, vars: { a } }, { id: "lnFactorInverted", at: 2, vars: { a } }], fill(K.whichQ, { f: `log${sub(a)} x` }),
        [`\\log_{${a}} x = \\frac{\\ln x}{\\ln ${a}}`, `\\frac{d}{dx}\\log_{${a}} x = \\frac{1}{x \\ln ${a}}`]);
    }
    const a = r.nz(-6, 6);
    if (r.next() < 0.5) {
      const b = r.nz(-6, 6);
      const e = parseE(polyStr([a, 2]));
      return {
        prompt: w.prompts.differentiate, q: `y = \\frac{${tex(parseE(polyStr([0, b, a, 1])))}}{x}`, show: `\\frac{dy}{dx} = ${tex(e)}`, plain: plainE(e), format: "expr",
        answer: { k: "expr", e, traps: [{ id: "derivativesDivided", a: { k: "expr", e: parseE(polyStr([b, 2 * a, 3])) } }] },
        steps: [`y = ${tex(parseE(polyStr([b, a, 1])))}`, `\\frac{dy}{dx} = ${tex(e)}`],
      };
    }
    const e = parseE(polyStr([0, 2 * a, 3]));
    return {
      prompt: w.prompts.differentiate, q: `y = x^{2}\\left(${tex(parseE(polyStr([a, 1])))}\\right)`, show: `\\frac{dy}{dx} = ${tex(e)}`, plain: plainE(e), format: "expr",
      answer: { k: "expr", e, traps: [{ id: "derivativesMultiplied", a: { k: "expr", e: parseE("2x") } }] },
      steps: [`y = ${tex(parseE(polyStr([0, 0, a, 1])))}`, `\\frac{dy}{dx} = ${tex(e)}`],
    };
  }
  const t = r.pick(["trig", "second", "error"] as const);
  if (t === "trig") {
    const fn = r.pick(["tan", "cot", "sec", "csc"] as const);
    const k = r.int(1, 4);
    const u = k === 1 ? "x" : `${k}x`;
    const kk = k === 1 ? "" : String(k);
    const d = (f: "tan" | "cot" | "sec" | "csc", c: string) => ({ tan: `${c}sec²(${u})`, cot: `−${c}csc²(${u})`, sec: `${c}sec(${u}) tan(${u})`, csc: `−${c}csc(${u}) cot(${u})` })[f];
    const flip = (s: string) => (s.startsWith("−") ? s.slice(1) : `−${s}`);
    const co = ({ tan: "cot", cot: "tan", sec: "csc", csc: "sec" } as const)[fn];
    const opts = [d(fn, kk), flip(d(fn, kk)), d(co, kk), ...(k > 1 ? [d(fn, "")] : [])];
    const tx = { tan: "\\tan", cot: "\\cot", sec: "\\sec", csc: "\\csc" }[fn];
    return pickPart(r, opts, 0, [{ id: "trigDerivSign", at: 1 }, { id: "trigCofunctionSwapped", at: 2 }, ...(k > 1 ? [{ id: "chainInsideLost" as const, at: 3, vars: { k, u } }] : [])],
      fill(K.whichQ, { f: `${fn}(${u})` }), [`\\frac{d}{dx}${tx}(${u}) = ${k === 1 ? "" : `${k} \\cdot `}${tx}'(${u})`]);
  }
  if (t === "second") {
    const cs = [r.int(-6, 6), r.int(-6, 6), r.int(-5, 5), r.int(-3, 3), r.nz(-2, 2)];
    const x = r.int(-2, 2);
    const v = 12 * cs[4] * x * x + 6 * cs[3] * x + 2 * cs[2];
    const d1 = 4 * cs[4] * x ** 3 + 3 * cs[3] * x * x + 2 * cs[2] * x + cs[1];
    return {
      prompt: fill(K.secondQ, { a: minus(x) }), q: `f(x) = ${tex(parseE(polyStr(cs)))}`,
      ...exact(F(v), [["firstForSecond", F(d1)]]),
      steps: [`f'(x) = ${tex(simp(derive(parseE(polyStr(cs)))))}`, `f''(x) = ${tex(parseE(polyStr([2 * cs[2], 6 * cs[3], 12 * cs[4]])))}`, `f''(${x}) = ${v}`],
    };
  }
  const [n, a, b] = [r.int(2, 4), r.int(2, 4), r.nz(-5, 5)];
  const kind = r.int(0, 3);
  const inner = `${a}x ${b < 0 ? "-" : "+"} ${Math.abs(b)}`;
  const [fq, claim, right] = [
    [`x^{${n}}\\sin x`, `${n}x^{${n - 1}}\\cos x`, `${n}x^{${n - 1}}\\sin x + x^{${n}}\\cos x`],
    [`(${inner})^{${n}}`, `${n}(${inner})^{${n - 1}}`, `${a * n}(${inner})^{${n - 1}}`],
    [`\\frac{x}{x + ${a}}`, `\\frac{x \\cdot 1 - (x + ${a}) \\cdot 1}{(x + ${a})^{2}}`, `\\frac{${a}}{(x + ${a})^{2}}`],
    [`(${inner})^{${n}}`, `${a * n}(${inner})^{${n - 1}}`, `${a * n}(${inner})^{${n - 1}}`],
  ][kind];
  return { ...pickPart(r, [K.eProd, K.eChain, K.eQuot, K.eNone], kind, [{ id: "errorNotSeen", at: 3 }], K.errorQ, [`f'(x) = ${right}`]), q: `f(x) = ${fq}, \\quad f'(x) = ${claim}` };
}

/** The steps of differentiating f: each term of a sum, u′ and v′ of a product or quotient, or the inside's derivative. */
function diffSteps(f: E, w: PracticeWords): Part[] {
  const p = diffParts(f);
  const d = (name: string, e: E) => exprPart(w.prompts.stepDiff, `${name} = ${tex(e)}: \\quad \\frac{d${name}}{dx}`, simp(derive(e)));
  if (!p) return [];
  if (p.kind === "sum") return p.terms.map((t) => exprPart(w.prompts.stepDiff, `\\frac{d}{dx}\\left(${tex(t)}\\right)`, simp(derive(t))));
  return p.kind === "chain" ? [d("u", p.inner)] : [d("u", p.u), d("v", p.v)];
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  let src: string;
  if (L === 1) {
    const n = r.int(3, 5);
    const cs = Array.from({ length: n + 1 }, (_, k) => (k === n ? r.nz(-6, 6) : r.next() < 0.6 ? r.int(-9, 9) : 0));
    src = polyStr(cs);
  } else if (L === 2) {
    const [a, b, k, n] = [r.int(2, 5), r.nz(-6, 6), r.nz(-4, 4), r.int(2, 5)];
    src = r.pick([`(${polyStr([b, a])})^${n}`, `e^(${k}x)`, `sin(${a}x)`, `cos(${a}x)`, `${a}x^2 + ${Math.abs(b)}/x`, `${a}sqrt(x)`, `${a}e^(${k}x) + x^${n}`]);
  } else {
    const [a, n] = [r.int(1, 5), r.int(2, 4)];
    src = r.pick([`x^${n} e^x`, `x^${n} sin x`, `x cos(${a}x)`, `ln(x^2 + ${a})`, `x/(x + ${a})`, `(x^2 + ${a})^${n}`, `e^(x^2)`, `(x^2 + 1)/(x - ${a})`, `x ln x`, `e^(${a}x) sin x`]);
  }
  const f = parseE(src);
  const d = simp(derive(f));
  return {
    prompt: w.prompts.differentiate, q: `y = ${tex(f)}`, answer: { k: "expr", e: d }, show: `\\frac{dy}{dx} = ${tex(d)}`, plain: plainE(d), format: "expr",
    solution: { kind: "deriv", spec: { topic: "rules", src, at: "" } }, worked: diffSteps(f, w),
  };
};

export default gen;
