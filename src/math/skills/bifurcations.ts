// Practice: bifurcations. Easy finds the critical r of a saddle-node bifurcation of x′ = r ± (x² + 2mx), where f = 0
// and f′ = 0 together (the discriminant set to zero without dividing by 4, the x of the meeting point given for r,
// named); medium names the bifurcation of a normal form at r = 0 (a transcritical one called saddle-node because f is
// quadratic, the two pitchforks swapped, named); hard lists the stable fixed points for a given r of a pitchfork or a
// transcritical bifurcation (the origin kept stable, the root left off, the pitchfork's kind or the sign read the
// wrong way, named).
import { exact, F, pickOf, word } from "../calculusTwo";
import { listed } from "../dynamics";
import type { Frac } from "../fraction";
import type { MistakeId } from "../mistakes";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const kx = (k: number, p: string) => (k === 1 ? p : `${k}${p}`);

function criticalPart(r: Rng, w: PracticeWords): Part {
  const m = r.pick([-5, -4, -3, -2, 2, 3, 4, 5]);
  const s = r.sign();
  const lin = `${m < 0 ? "-" : "+"} ${2 * Math.abs(m)}x`;
  const q = s > 0 ? `\\dot{x} = r + x^{2} ${lin}` : `\\dot{x} = r - x^{2} ${m < 0 ? "+" : "-"} ${2 * Math.abs(m)}x`;
  const rc = s * m * m;
  return {
    prompt: w.dyn.prompt.critical,
    q,
    ...exact(F(rc), [["discriminantNotQuartered", 4 * rc], ["bifurcationPointX", -m]]),
    steps: [
      `f'(x) = ${s > 0 ? "" : "-"}(2x ${m < 0 ? "-" : "+"} ${2 * Math.abs(m)}) = 0 \\implies x^* = ${-m}`,
      `f(x^*) = r ${s > 0 ? "-" : "+"} ${m * m} = 0 \\implies r_c = ${rc}`,
    ],
  };
}

type Kind = "saddleNode" | "transcritical" | "supercritical" | "subcritical";
const KINDS: Kind[] = ["saddleNode", "transcritical", "supercritical", "subcritical"];

function kindPart(r: Rng, w: PracticeWords): Part {
  const kind = r.pick(KINDS);
  const k = r.int(1, 3);
  const forms: Record<Kind, string[]> = {
    saddleNode: [`r - ${kx(k, "x^{2}")}`, `r + ${kx(k, "x^{2}")}`],
    transcritical: [`rx - ${kx(k, "x^{2}")}`, `x(r - ${kx(k, "x")})`, `rx + ${kx(k, "x^{2}")}`],
    supercritical: [`rx - ${kx(k, "x^{3}")}`, `x(r - ${kx(k, "x^{2}")})`],
    subcritical: [`rx + ${kx(k, "x^{3}")}`, `x(r + ${kx(k, "x^{2}")})`],
  };
  const options = KINDS.map((x) => word(w.dyn.kinds[x]));
  const right = KINDS.indexOf(kind);
  const slips: [MistakeId, number][] =
    kind === "transcritical" ? [["quadraticMeansSaddleNode", 0]] : kind === "supercritical" ? [["pitchforkTypeSwapped", 3]] : kind === "subcritical" ? [["pitchforkTypeSwapped", 2]] : [];
  const rk = k === 1 ? "r" : `r/${k}`;
  const why: Record<Kind, string> = {
    saddleNode: `x^* = \\pm\\sqrt{\\mp ${rk}}: \\text{ two fixed points on one side of } r = 0, \\text{ none on the other}`,
    transcritical: `x^* = 0 \\text{ and } x^* = \\pm ${rk}: \\text{ they cross at } r = 0 \\text{ and swap stability}`,
    supercritical: `x^* = 0, \\ \\pm\\sqrt{${rk}} \\text{ for } r > 0: \\text{ two stable branches grow as } 0 \\text{ loses stability}`,
    subcritical: `x^* = 0, \\ \\pm\\sqrt{-${rk}} \\text{ for } r < 0: \\text{ the outer branches are unstable}`,
  };
  return {
    prompt: w.dyn.prompt.kind,
    q: `\\dot{x} = ${r.pick(forms[kind])}`,
    ...pickOf(options, right, slips),
    steps: [why[kind], `\\text{${options[right].text}}`],
  };
}

function stablePart(r: Rng, w: PracticeWords): Part {
  const k = r.int(1, 3);
  const s = r.int(2, 3);
  const kind = r.pick(["supercritical", "subcritical", "transcritical"] as const);
  const traps: { id: MistakeId; vs: Frac[] }[] = [];
  let q: string, rv: number, vs: Frac[], steps: string[];
  if (kind === "supercritical") {
    rv = k * s * s;
    q = `\\dot{x} = rx - ${kx(k, "x^{3}")}`;
    vs = [F(-s), F(s)];
    traps.push({ id: "originStillStable", vs: [F(-s), F(0), F(s)] }, { id: "squaresNoRoot", vs: [F(-s * s), F(s * s)] });
    steps = [`x^* = 0, \\ \\pm\\sqrt{${rv}/${k}} = \\pm ${s}`, `f'(0) = r = ${rv} > 0, \\quad f'(\\pm ${s}) = ${rv} - ${3 * k}\\cdot ${s * s} = ${rv - 3 * k * s * s} < 0`];
  } else if (kind === "subcritical") {
    rv = -k * s * s;
    q = `\\dot{x} = rx + ${kx(k, "x^{3}")}`;
    vs = [F(0)];
    traps.push({ id: "pitchforkTypeSwapped", vs: [F(-s), F(s)] }, { id: "originStillStable", vs: [F(-s), F(0), F(s)] });
    steps = [`x^* = 0, \\ \\pm\\sqrt{${-rv}/${k}} = \\pm ${s}`, `f'(0) = r = ${rv} < 0, \\quad f'(\\pm ${s}) = ${rv} + ${3 * k}\\cdot ${s * s} = ${rv + 3 * k * s * s} > 0`];
  } else {
    const sg = r.sign();
    rv = sg * k * s;
    q = `\\dot{x} = rx - ${kx(k, "x^{2}")}`;
    // f′(0) = r and f′(r/k) = −r: the stable one is r/k for r > 0 and 0 for r < 0
    vs = [F(sg > 0 ? s : 0)];
    traps.push({ id: "stabilitySignSwapped", vs: [F(sg > 0 ? 0 : -s)] });
    steps = [`x^* = 0, \\ ${rv}/${k} = ${sg * s}`, `f'(0) = r = ${rv}, \\quad f'(${sg * s}) = ${rv} - ${2 * k}\\cdot ${sg * s} = ${-rv}`];
  }
  return { prompt: fill(w.dyn.prompt.stableAt, { r: rv }), q, ...listed(vs, traps), steps };
}

const gen: Gen = (r, L, w) => (L === 1 ? criticalPart(r, w) : L === 2 ? kindPart(r, w) : stablePart(r, w));

export default gen;
