// Practice: Stationary points. Since #746 half the seeds read the shape of a graph from f′ and f″ instead: where f
// increases from f′ factored, the relative extremes from a sign chart of f′, concavity at a point of a drawn graph, the
// reason for a relative extreme (L1); the absolute extremes over all x, where f is concave up or down, a point of
// inflection, the second derivative test, the reason for concavity (L2); counting f's turns on a drawn graph of f′,
// telling f, f′ and f″ apart, and, a new setting, when sales or a rumour spread fastest (L3).
import { exact, F } from "../calculusTwo";
import { C, fill } from "../chart";
import { derive } from "../derive";
import { parseE, simp, tex } from "../expr";
import { limitPic } from "../limitGraph";
import { minus } from "../logicSets";
import { exprPart, polyStr, T } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";

const font = `font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif"`;
const place = (body: string, w: number, h: number) => ({ svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`, w, h });
/** (x − p) in TeX, or x when p is 0. */
const lin = (p: number) => (p === 0 ? "x" : `(x ${p < 0 ? "+" : "-"} ${Math.abs(p)})`);
const sg = (s: number) => (s > 0 ? "+" : "-");

/** A sign chart: a number line with the points xs and the sign of `name` on each stretch between them. */
function signChart(xs: number[], signs: number[], name: string) {
  const at = (i: number) => 40 + ((i + 1) * 380) / (xs.length + 1);
  const out = [`<text x="4" y="22" font-size="17" font-weight="700" ${font} fill="${C.ink}">${name}</text>`, `<line x1="30" y1="54" x2="450" y2="54" stroke="${C.ink}" stroke-width="1.6"/>`];
  xs.forEach((x, i) => out.push(`<line x1="${at(i)}" y1="46" x2="${at(i)}" y2="62" stroke="${C.ink}" stroke-width="1.6"/>`,
    `<text x="${at(i)}" y="82" font-size="15" text-anchor="middle" ${font} fill="${C.ink}">${minus(x)}</text>`));
  signs.forEach((s, i) => {
    const [a, b] = [i === 0 ? 30 : at(i - 1), i === xs.length ? 450 : at(i)];
    out.push(`<text x="${(a + b) / 2}" y="42" font-size="24" font-weight="700" text-anchor="middle" ${font} fill="${s > 0 ? C.green : C.orange}">${s > 0 ? "+" : "−"}</text>`);
  });
  return place(out.join(""), 460, 92);
}

/** Three small graphs side by side, lettered A, B, C, each scaled to fit its own box over −3 ≤ x ≤ 3. */
function threeGraphs(fs: ((x: number) => number)[]) {
  const [bw, bh, gap] = [170, 130, 16];
  const out: string[] = [];
  fs.forEach((f, k) => {
    const x0 = k * (bw + gap);
    const xs = Array.from({ length: 61 }, (_, i) => -3 + i / 10);
    const ys = xs.map(f);
    const m = Math.max(...ys.map(Math.abs)) || 1;
    const X = (x: number) => x0 + ((x + 3) / 6) * bw;
    const Y = (y: number) => 28 + bh / 2 - (y / m) * (bh / 2 - 6);
    out.push(`<rect x="${x0}" y="28" width="${bw}" height="${bh}" fill="#fff" stroke="#dee2e6"/>`,
      `<line x1="${x0}" y1="${Y(0)}" x2="${x0 + bw}" y2="${Y(0)}" stroke="${C.ink}" stroke-width="1.2"/>`,
      `<line x1="${X(0)}" y1="28" x2="${X(0)}" y2="${28 + bh}" stroke="${C.ink}" stroke-width="1.2"/>`,
      `<polyline points="${xs.map((x, i) => `${X(x).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join(" ")}" fill="none" stroke="${C.blue}" stroke-width="2.4"/>`,
      `<text x="${x0 + bw / 2}" y="20" font-size="18" font-weight="700" text-anchor="middle" ${font} fill="${C.ink}">${"ABC"[k]}</text>`);
  });
  return place(out.join(""), 3 * bw + 2 * gap + 2, bh + 32);
}

/** The shape of the graph (#746), on half the seeds. */
function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.stK;
  if (L === 1) {
    const t = r.pick(["incr", "chart", "concave", "reason"] as const);
    if (t === "incr") {
      const p = r.int(-4, 2);
      const q = p + r.int(1, 4);
      const k = r.pick([1, -1]);
      const inc = r.next() < 0.5;
      const opts = [fill(K.either, { a: `x < ${minus(p)}`, b: `x > ${minus(q)}` }), `${minus(p)} < x < ${minus(q)}`, `x > ${minus(q)}`];
      const right = (k > 0) === inc ? 0 : 1;
      const traps: { id: Trap["id"]; at: number; vars: Record<string, string> }[] = [{ id: "intervalsSwapped", at: 1 - right, vars: { p: minus(p), q: minus(q) } }, ...(right === 0 ? [{ id: "oneIntervalOnly" as const, at: 2, vars: { p: minus(p) } }] : [])];
      const fp = (x: number) => k * (x - p) * (x - q);
      const mid = (p + q) / 2;
      return {
        ...pickPart(r, opts, right, traps, inc ? K.incQ : K.decQ, [`f'(${p - 1}) = ${fp(p - 1)}, \\quad f'(${mid}) = ${fp(mid)}, \\quad f'(${q + 1}) = ${fp(q + 1)}`]),
        q: `f'(x) = ${k < 0 ? "-" : ""}${q === 0 ? `x${lin(p)}` : `${lin(p)}${lin(q)}`}`,
      };
    }
    if (t === "chart") {
      const a = r.int(-4, -2);
      const b = r.int(a + 2, 1);
      const c = r.int(b + 2, 4);
      const xs = [a, b, c];
      const z = r.int(0, 2);
      const signs = [r.pick([1, -1])];
      for (let i = 0; i < 3; i++) signs.push(i === z ? signs[i] : -signs[i]);
      const kinds = xs.map((_, i) => (i === z ? 0 : signs[i] < 0 ? -1 : 1));
      const max = r.next() < 0.5;
      const right = kinds.indexOf(max ? 1 : -1);
      const other = kinds.indexOf(max ? -1 : 1);
      return {
        ...pickPart(r, xs.map((x) => `x = ${minus(x)}`), right, [{ id: "extremumKindSwapped", at: other, vars: { p: minus(xs[other]) } }, { id: "zeroWithoutSignChange", at: z, vars: { p: minus(xs[z]) } }],
          max ? K.chartMaxQ : K.chartMinQ, xs.map((x, i) => `x = ${x}: \\ ${sg(signs[i])} \\to ${sg(signs[i + 1])}`)),
        pic: signChart(xs, signs, "f′(x)"),
      };
    }
    if (t === "concave") {
      const h = r.int(-1, 1);
      const c = h + r.pick([-3, -2, 2, 3]);
      const s = r.pick([1, -1]);
      const v = r.int(-2, 2);
      const f = (x: number) => s * ((x - h) ** 3 / 6 - 1.5 * (x - h)) + v;
      const f1 = s * ((c - h) ** 2 / 2 - 1.5);
      const f2 = s * (c - h);
      const right = f2 > 0 ? 0 : 1;
      const wrong = 1 - right;
      const traps = (wrong === 0 && f1 > 0) || (wrong === 1 && f1 < 0) ? [{ id: "concavityFromSlope" as const, at: wrong, vars: { c: minus(c) } }] : [];
      return {
        ...pickPart(r, [K.cUp, K.cDown].map((o) => fill(o, { c: minus(c) })), right, traps, fill(K.concQ, { c: minus(c) }), [`f''(${c}) ${f2 > 0 ? ">" : "<"} 0`]),
        pic: limitPic({ pieces: [{ f, from: -6, to: 6 }], closed: [[c, f(c)]] }),
      };
    }
    const c = r.int(-4, 4);
    const min = r.next() < 0.5;
    const opts = [min ? K.jNegPos : K.jPosNeg, K.jZero, min ? K.jPosNeg : K.jNegPos].map((o) => fill(o, { c: minus(c) }));
    return pickPart(r, opts, 0, [{ id: "zeroAloneJustifies", at: 1, vars: { c: minus(c) } }, { id: "signChangeReversed", at: 2, vars: { c: minus(c) } }], fill(min ? K.justMinQ : K.justMaxQ, { c: minus(c) }),
      [`x = ${c}: \\ f' \\ ${min ? "- \\to +" : "+ \\to -"}`]);
  }
  if (L === 2) {
    const t = r.pick(["abs", "concInt", "inflect", "test", "reason"] as const);
    if (t === "abs") {
      const a = r.int(1, 2);
      const c = r.int(-5, 5);
      const src = polyStr([c, 0, -2 * a * a, 0, 1]);
      const steps = [`f'(x) = 4x^{3} - ${4 * a * a}x = 4x(x - ${a})(x + ${a})`, `f(\\pm ${a}) = ${c - a ** 4}, \\quad f(0) = ${c}`, `x \\to \\pm\\infty: \\ f(x) \\to \\infty`];
      if (r.next() < 0.5) return { prompt: K.absMinQ, q: `f(x) = ${T(src)}`, ...exact(F(c - a ** 4), [["extremeXForValue", F(a), { x: a, v: minus(c - a ** 4) }]]), steps };
      return { ...pickPart(r, [K.noMax, fill(K.maxAt0, { v: minus(c) })], 0, [{ id: "localMaxAsAbsolute", at: 1, vars: { v: minus(c) } }], K.absMaxQ, steps), q: `f(x) = ${T(src)}` };
    }
    if (t === "concInt") {
      const h = r.int(-3, 3);
      const s = r.pick([1, -1]);
      const up = r.next() < 0.5;
      const src = polyStr([r.int(-6, 6), r.int(-6, 6), -3 * s * h, s]);
      const right = (s > 0) === up ? 0 : 1;
      return {
        ...pickPart(r, [`x > ${minus(h)}`, `x < ${minus(h)}`], right, [{ id: "concavityIntervalsSwapped", at: 1 - right, vars: { h: minus(h) } }], up ? K.upQ : K.downQ,
          [`f''(x) = ${tex(parseE(polyStr([-6 * s * h, 6 * s])))}`, `f''(x) = 0: \\ x = ${h}`]),
        q: `f(x) = ${T(src)}`,
      };
    }
    if (t === "inflect") {
      if (r.next() < 0.5) {
        let p = r.int(-4, 3);
        let q = p + 2 * r.int(1, 3);
        if (q > 5) [p, q] = [p - 2, q - 2];
        const h = (p + q) / 2;
        const src = polyStr([r.int(-6, 6), 3 * p * q, (-3 * (p + q)) / 2, 1]);
        return {
          prompt: K.inflQ, q: `f(x) = ${T(src)}`, ...exact(F(h), [["stationaryForInflection", F(p), { p: minus(p), q: minus(q), h: minus(h) }]]),
          steps: [`f'(x) = 3${lin(p)}${lin(q)}`, `f''(x) = ${tex(parseE(polyStr([-3 * (p + q), 6])))} = 0: \\ x = ${h}`],
        };
      }
      const p = r.int(-3, 3);
      let q = r.int(-3, 3);
      while (q === p) q = r.int(-3, 3);
      return {
        ...pickPart(r, [`x = ${minus(q)}`, `x = ${minus(p)}`, `x = ${minus(Math.min(p, q))}; x = ${minus(Math.max(p, q))}`], 0,
          [{ id: "zeroWithoutSignChange", at: 1, vars: { p: minus(p) } }, { id: "zeroWithoutSignChange", at: 2, vars: { p: minus(p) } }], K.inflPickQ,
          [`${lin(p)}^{2} \\ge 0`, `x = ${q}: \\ f'' \\ ${sg(-1)} \\to ${sg(1)}`]),
        q: `f''(x) = ${lin(p)}^{2}${lin(q)}`,
      };
    }
    if (t === "test") {
      const c = r.int(-4, 4);
      const v = r.next() < 0.25 ? 0 : r.nz(-6, 6);
      const right = v < 0 ? 0 : v > 0 ? 1 : 3;
      const traps = v < 0 ? [{ id: "secondTestSwapped" as const, at: 1 }] : v > 0 ? [{ id: "secondTestSwapped" as const, at: 0 }] : [{ id: "zeroSecondMeansInflection" as const, at: 2 }];
      return {
        ...pickPart(r, [K.tMax, K.tMin, K.tInfl, K.tNone], right, traps, fill(K.testQ, { c: minus(c) }), [`f''(${c}) = ${v} ${v < 0 ? "<" : v > 0 ? ">" : "="} 0`]),
        q: `f'(${c}) = 0, \\quad f''(${c}) = ${v}`,
      };
    }
    const a = r.int(-4, 1);
    const b = a + r.int(2, 4);
    const down = r.next() < 0.5;
    const v = { a: minus(a), b: minus(b) };
    const opts = (down ? [K.f2Neg, K.f1Neg, K.f2Pos] : [K.f2Pos, K.f1Pos, K.f2Neg]).map((o) => fill(o, v));
    return pickPart(r, opts, 0, [{ id: "slopeForBending", at: 1 }, { id: "concavitySignSwapped", at: 2 }], fill(down ? K.j2DownQ : K.j2UpQ, v), [`f'' ${down ? "<" : ">"} 0`]);
  }
  const t = r.pick(["count", "connect", "setting"] as const);
  if (t === "count") {
    const a = r.int(-4, -2);
    const b = r.int(a + 2, 1);
    const c = r.int(b + 2, 4);
    const s = r.pick([1, -1]);
    const g0 = (x: number) => (x - a) * (x - b) * (x - c);
    const m = Math.max(...Array.from({ length: 101 }, (_, i) => Math.abs(g0(-5 + i / 10))));
    const g = (x: number) => (s * g0(x) * 4.5) / m;
    const max = r.next() < 0.5;
    const nMax = s > 0 ? 1 : 2;
    const v = max ? nMax : 3 - nMax;
    const signs = [-s, s, -s, s];
    return {
      prompt: max ? K.countMaxQ : K.countMinQ, q: "",
      ...exact(F(v), [["allZerosCounted", F(3)], ["countSwapped", F(3 - v)]]),
      steps: [a, b, c].map((x, i) => `x = ${x}: \\ f' \\ ${sg(signs[i])} \\to ${sg(signs[i + 1])}`),
      pic: limitPic({ pieces: [{ f: g, from: -6, to: 6 }], closed: [[a, 0], [b, 0], [c, 0]], label: "f′" }),
    };
  }
  if (t === "connect") {
    const m = r.int(1, 3);
    const s = r.pick([1, -1]);
    const fns = [(x: number) => s * (x ** 3 / 3 - m * x), (x: number) => s * (x * x - m), (x: number) => 2 * s * x];
    const order = [0, 1, 2];
    for (let i = 2; i > 0; i--) {
      const j = r.int(0, i);
      [order[i], order[j]] = [order[j], order[i]];
    }
    const letter = (j: number) => "ABC"[order.indexOf(j)];
    const second = r.next() < 0.5;
    const [want, near] = second ? [2, 1] : [1, 2];
    const opts = [letter(want), letter(near), letter(0)];
    return {
      ...pickPart(r, opts, 0, [{ id: "derivativeOrderSwapped", at: 1, vars: { a: letter(near) } }, { id: "fForDerivative", at: 2, vars: { a: letter(0) } }], second ? K.whichF2Q : K.whichF1Q,
        [`f(x) = ${tex(parseE(s > 0 ? `x^3/3 - ${m}x` : `${m}x - x^3/3`))}`, `f'(x) = ${tex(parseE(polyStr([-s * m, 0, s])))}`, `f''(x) = ${2 * s}x`]),
      pic: threeGraphs(order.map((j) => fns[j])),
    };
  }
  const h = r.int(2, 6);
  const rumour = r.next() < 0.5;
  return {
    prompt: fill(rumour ? K.rumourQ : K.salesQ, { t2: 2 * h, f: `−t³ + ${3 * h}t²` }), q: "",
    ...exact(F(h), [["stationaryForInflection", F(2 * h), { p: 2 * h, q: 0, h }]]),
    steps: [`N'(t) = -3t^{2} + ${6 * h}t`, `N''(t) = -6t + ${6 * h} = 0: \\ t = ${h}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  let cs: number[];
  let xs: number[];
  if (L === 1) {
    const [a, h] = [r.nz(-3, 3), r.int(-5, 5)];
    cs = [r.int(-9, 9), -2 * a * h, a];
    xs = [h];
  } else if (L === 2) {
    let p: number, q: number, k: number;
    do [p, q, k] = [r.int(-4, 4), r.int(-4, 4), r.pick([1, 2])];
    while (p === q || (k === 1 && (p + q) % 2 !== 0));
    // f′ = 3k(x − p)(x − q)
    cs = [r.int(-9, 9), 3 * k * p * q, (-3 * k * (p + q)) / 2, k];
    xs = [p, q].sort((a, b) => a - b);
  } else if (r.next() < 0.5) {
    const a = r.int(1, 3);
    cs = [r.int(-9, 9), 0, -2 * a * a, 0, 1];
    xs = [-a, 0, a];
  } else {
    const p = r.nz(-2, 2);
    cs = [r.int(-9, 9), 0, 0, -4 * p, 1];
    xs = [0, 3 * p].sort((a, b) => a - b);
  }
  const src = polyStr(cs);
  return {
    prompt: w.prompts.stationary, q: `y = ${T(src)}`, answer: { k: "set", vs: xs, tol: 1e-9 }, show: xs.map((x) => `x = ${x}`).join(", \\; "), plain: xs.join("; "), format: "roots",
    solution: { kind: "deriv", spec: { topic: "stationary", src, at: "" } },
    worked: [exprPart(w.prompts.stepDiff, `y = ${T(src)}: \\quad \\frac{dy}{dx}`, simp(derive(parseE(src))))],
  };
};

export default gen;
