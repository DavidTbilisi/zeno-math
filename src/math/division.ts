// Long division, step by step, in three school layouts:
//  • bracket — the English long-division bracket, quotient on top;
//  • corner  — the layout used in Russia, Georgia and much of Europe ("уголком"): divisor to the
//              right of a corner, quotient under it, decimal comma;
//  • short   — short division ("bus stop"): the remainders are carried as small digits.
// Each step is one quotient digit: divide, multiply, subtract, bring down the next digit.
// With decimals > 0 the division continues past the point, and a repeating decimal is detected
// when a remainder comes back.
import type { RenderedSvg } from "./latex";

export type DivisionStyle = "bracket" | "corner" | "short";
export const DIVISION_STYLES: DivisionStyle[] = ["bracket", "corner", "short"];
export type DivisionSpec = { type: "division"; style: DivisionStyle; a: number; b: number; decimals: number; step: number };
export const DIVISION_LIMITS = { a: 99_999_999, b: 9_999, decimals: 10 };

type Step = { pos: number; cur: number; q: number; r: number };
export type DivisionPlan = { digits: number[]; intLen: number; steps: Step[]; repeatFrom: number | null; first: number; exact: boolean };

/** The steps of a ÷ b: every quotient digit with the number divided at that point and the remainder. */
export function planDivision(a: number, b: number, decimals: number): DivisionPlan {
  const intDigits = String(a).split("").map(Number);
  const intLen = intDigits.length;
  const digits = [...intDigits, ...Array(decimals).fill(0)];
  // The first step uses the shortest prefix that is at least b (or all the whole-number digits).
  let first = 0;
  let cur = intDigits[0];
  while (cur < b && first < intLen - 1) cur = cur * 10 + intDigits[++first];
  const steps: Step[] = [];
  const seen = new Map<number, number>(); // remainder before a decimal digit → its position
  let repeatFrom: number | null = null;
  for (let pos = first; ; pos++) {
    if (pos > first) cur = steps[steps.length - 1].r * 10 + digits[pos];
    const q = Math.floor(cur / b);
    const r = cur - q * b;
    steps.push({ pos, cur, q, r });
    const next = pos + 1;
    if (next >= digits.length) break;
    if (next >= intLen) {
      if (r === 0) break; // exact: no more decimal digits needed
      if (seen.has(r)) {
        repeatFrom = seen.get(r)!;
        break;
      }
      seen.set(r, next);
    }
  }
  // The decimal digits actually used (trailing zeros that were never needed are dropped).
  const last = steps[steps.length - 1];
  const used = Math.max(intLen, last.pos + 1);
  return { digits: digits.slice(0, used), intLen, steps, repeatFrom, first, exact: last.r === 0 };
}

export function divisionStepCount(spec: DivisionSpec): number {
  return planDivision(spec.a, spec.b, spec.decimals).steps.length;
}

const INK = "#1e1e1e";
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const GREEN = "#2f9e44";
const GREY = "#adb5bd";
const FONT = `font-family="Consolas, 'Courier New', monospace"`;
const SANS = `font-family="Segoe UI, Helvetica, Arial, sans-serif"`;
const r1 = (v: number) => Math.round(v * 10) / 10;
const ch = (x: number, y: number, s: string, color = INK, size = 22, bold = false) =>
  `<text x="${r1(x)}" y="${r1(y)}" ${FONT} font-size="${size}" text-anchor="middle" fill="${color}"${bold ? ' font-weight="700"' : ""}>${s}</text>`;
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUBS = "₀₁₂₃₄₅₆₇₈₉";
const sup = (n: number) => String(n).replace(/\d/g, (d) => SUP[Number(d)]);
const sub = (n: number) => String(n).replace(/\d/g, (d) => SUBS[Number(d)]);

/** The quotient as text, e.g. "52.08(3)" or "52,1"; sep is the decimal separator. */
function quotientText(plan: DivisionPlan, sep: string, upTo = Infinity): string {
  let s = "";
  let started = false;
  for (const st of plan.steps) {
    if (st.pos >= plan.first + upTo) break;
    if (st.pos === plan.intLen) s += (started ? "" : "0") + sep;
    if (plan.repeatFrom !== null && st.pos === plan.repeatFrom) s += "(";
    if (st.q || started || st.pos >= plan.intLen - 1) (s += st.q), (started = true);
  }
  if (!started) s = "0";
  if (plan.repeatFrom !== null) s += ")";
  return s;
}

export function renderDivision(spec: DivisionSpec): RenderedSvg {
  const { a, b, style } = spec;
  if (!(Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 1 && a <= DIVISION_LIMITS.a && b <= DIVISION_LIMITS.b)) throw new Error("range");
  const decimals = Math.max(0, Math.min(DIVISION_LIMITS.decimals, Math.round(spec.decimals)));
  const plan = planDivision(a, b, decimals);
  const k = Math.max(0, Math.min(spec.step, plan.steps.length));
  const corner = style === "corner";
  const sep = corner ? "," : ".";
  const cw = 24; // one digit column
  const rowH = 30;
  const out: string[] = [];
  const bStr = String(b);
  const nDig = plan.digits.length;
  const decAt = plan.intLen; // the decimal point sits before this column
  const hasDec = nDig > plan.intLen;
  // Column centre; decimal digits are shifted right to leave room for the point.
  const colX = (x0: number, c: number) => x0 + c * cw + cw / 2 + (hasDec && c >= decAt ? 8 : 0);

  let x0: number;
  let y0: number;
  let width: number;
  const shown = plan.steps.slice(0, k);
  const done = k >= plan.steps.length;

  if (style === "short") {
    // Short division: a bracket, quotient digits on top, remainders carried as small digits.
    const scw = 34;
    x0 = 30 + bStr.length * 14 + 20;
    y0 = 70;
    const cx = (c: number) => x0 + c * scw + scw / 2 + (hasDec && c >= decAt ? 8 : 0);
    const endX = cx(nDig - 1) + scw / 2 + 6;
    out.push(`<text x="${x0 - 16}" y="${y0}" ${FONT} font-size="24" text-anchor="end" fill="${INK}" font-weight="700">${bStr}</text>`);
    out.push(`<path d="M${x0 - 10},${y0 - 30} Q${x0 + 2},${y0 - 12} ${x0 - 10},${y0 + 10}" fill="none" stroke="${INK}" stroke-width="2"/>`);
    out.push(`<line x1="${x0 - 10}" y1="${y0 - 30}" x2="${endX}" y2="${y0 - 30}" stroke="${INK}" stroke-width="2"/>`);
    plan.digits.forEach((d, c) => out.push(ch(cx(c), y0, String(d), c >= plan.intLen ? GREY : INK, 24)));
    if (hasDec) {
      out.push(ch(cx(decAt) - scw / 2 - 2, y0, sep, INK, 24));
      if (shown.some((s) => s.pos >= decAt)) out.push(ch(cx(decAt) - scw / 2 - 2, y0 - 38, sep, GREEN, 24, true));
    }
    shown.forEach((s, i) => {
      const leading = s.q === 0 && s.pos === plan.first && s.pos < plan.intLen - 1;
      if (!leading) out.push(ch(cx(s.pos), y0 - 38, String(s.q), GREEN, 24, true));
      const nextC = s.pos + 1;
      if (s.r && nextC < nDig && (i < shown.length - 1 || !done)) out.push(ch(cx(nextC) - 13, y0 - 12, String(s.r), ORANGE, 14, true));
    });
    if (plan.repeatFrom !== null && done) {
      const s0 = cx(plan.repeatFrom) - 10;
      const s1 = cx(plan.steps[plan.steps.length - 1].pos) + 10;
      out.push(`<line x1="${s0}" y1="${y0 - 62}" x2="${s1}" y2="${y0 - 62}" stroke="${GREEN}" stroke-width="2"/>`);
    }
    width = endX + 20;
    y0 += 30;
  } else if (!corner) {
    // Bracket layout: divisor ) dividend, quotient above, the working below.
    x0 = 30 + bStr.length * 14 + 22;
    y0 = 76;
    const endX = colX(x0, nDig - 1) + cw / 2 + 6;
    out.push(`<text x="${x0 - 16}" y="${y0}" ${FONT} font-size="22" text-anchor="end" fill="${INK}" font-weight="700">${bStr}</text>`);
    out.push(`<path d="M${x0 - 10},${y0 - 28} Q${x0 + 2},${y0 - 10} ${x0 - 10},${y0 + 10}" fill="none" stroke="${INK}" stroke-width="2"/>`);
    out.push(`<line x1="${x0 - 10}" y1="${y0 - 28}" x2="${endX}" y2="${y0 - 28}" stroke="${INK}" stroke-width="2"/>`);
    width = endX + 20;
  } else {
    // Corner layout: dividend | divisor, a line under the divisor and the quotient below it.
    x0 = 40;
    y0 = 40;
    width = 0;
  }

  if (style !== "short") {
    plan.digits.forEach((d, c) => out.push(ch(colX(x0, c), y0, String(d), c >= plan.intLen ? GREY : INK)));
    if (hasDec) out.push(ch(colX(x0, decAt) - cw / 2 - 4, y0, sep));
    // The working: product and remainder rows.
    type Line = { text: string; end: number; row: number };
    let row = 0;
    let curLine: Line | null = null;
    const lines: { line: Line; step: number; kind: "prod" | "rem" }[] = [];
    const appended: { row: number; col: number; digit: number; step: number }[] = [];
    plan.steps.forEach((s, i) => {
      const nextC = s.pos + 1;
      const hasNext = nextC < nDig && !(i === plan.steps.length - 1);
      if (s.q > 0 || i === 0 || !curLine) {
        const prod: Line = { text: String(s.q * b), end: s.pos, row: ++row };
        lines.push({ line: prod, step: i, kind: "prod" });
        const remText = (s.r || !hasNext ? String(s.r) : "") + (hasNext ? String(plan.digits[nextC]) : "");
        curLine = { text: remText, end: hasNext ? nextC : s.pos, row: ++row };
        lines.push({ line: curLine, step: i, kind: "rem" });
        if (hasNext) appended.push({ row: curLine.row, col: nextC, digit: plan.digits[nextC], step: i });
      } else if (hasNext) {
        // A zero in the quotient: nothing to subtract, just bring down the next digit.
        appended.push({ row: curLine.row, col: nextC, digit: plan.digits[nextC], step: i });
      }
    });
    const rowY = (r: number) => y0 + r * rowH;
    for (const { line, step, kind } of lines) {
      if (step >= k) continue;
      const len = line.text.length;
      const brought = appended.some((ap) => ap.row === line.row && ap.step === step);
      line.text.split("").forEach((c, j) => {
        const col = line.end - len + 1 + j;
        const isBrought = kind === "rem" && brought && j === len - 1;
        out.push(ch(colX(x0, col), rowY(line.row), c, isBrought ? BLUE : kind === "prod" ? ORANGE : INK));
      });
      if (kind === "prod") {
        const startX = colX(x0, line.end - Math.max(len, String(plan.steps[step].cur).length) + 1) - cw / 2 - 2;
        out.push(ch(startX - 8, rowY(line.row) - 2, "−", ORANGE, 20));
        out.push(`<line x1="${r1(startX)}" y1="${rowY(line.row) + 8}" x2="${r1(colX(x0, line.end) + cw / 2)}" y2="${rowY(line.row) + 8}" stroke="${INK}" stroke-width="1.5"/>`);
      }
    }
    // Digits brought down by zero-quotient steps, and the dashed arrows for every bring-down.
    for (const ap of appended) {
      if (ap.step >= k) continue;
      const already = lines.some((l) => l.kind === "rem" && l.line.row === ap.row && l.step === ap.step);
      if (!already) out.push(ch(colX(x0, ap.col), rowY(ap.row), String(ap.digit), BLUE));
      out.push(`<line x1="${colX(x0, ap.col)}" y1="${y0 + 6}" x2="${colX(x0, ap.col)}" y2="${rowY(ap.row) - 20}" stroke="${BLUE}" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.6"/>`);
    }
    const lastRow = Math.max(0, ...lines.filter((l) => l.step < k).map((l) => l.line.row));
    const bottom = rowY(lastRow) + 10;
    // The quotient.
    if (!corner) {
      shown.forEach((s) => {
        const leading = s.q === 0 && s.pos === plan.first && s.pos < plan.intLen - 1;
        if (!leading) out.push(ch(colX(x0, s.pos), y0 - 38, String(s.q), GREEN, 22, true));
      });
      if (hasDec && shown.some((s) => s.pos >= decAt)) out.push(ch(colX(x0, decAt) - cw / 2 - 4, y0 - 38, sep, GREEN, 22, true));
      if (plan.repeatFrom !== null && done)
        out.push(`<line x1="${colX(x0, plan.repeatFrom) - 9}" y1="${y0 - 60}" x2="${colX(x0, plan.steps[plan.steps.length - 1].pos) + 9}" y2="${y0 - 60}" stroke="${GREEN}" stroke-width="2"/>`);
      y0 = bottom;
    } else {
      const vx = colX(x0, nDig - 1) + cw / 2 + 12;
      const q = quotientText(plan, sep, k).replace(/[()]/g, "");
      const boxW = Math.max(bStr.length, q.length) * 14 + 20;
      out.push(`<line x1="${vx}" y1="${y0 - 24}" x2="${vx}" y2="${y0 + 44}" stroke="${INK}" stroke-width="2"/>`);
      out.push(`<line x1="${vx}" y1="${y0 + 10}" x2="${vx + boxW}" y2="${y0 + 10}" stroke="${INK}" stroke-width="2"/>`);
      out.push(`<text x="${vx + 10}" y="${y0}" ${FONT} font-size="22" fill="${INK}" font-weight="700">${bStr}</text>`);
      if (k > 0) {
        // Quotient digits under the divisor, the repeating part overlined.
        let x = vx + 10;
        const full = quotientText(plan, sep, k);
        let repStart = 0;
        for (const c of full) {
          if (c === "(") {
            repStart = x;
            continue;
          }
          if (c === ")") {
            if (done) out.push(`<line x1="${repStart}" y1="${y0 + 19}" x2="${x}" y2="${y0 + 19}" stroke="${GREEN}" stroke-width="2"/>`);
            continue;
          }
          out.push(`<text x="${x}" y="${y0 + 38}" ${FONT} font-size="22" fill="${GREEN}" font-weight="700">${c}</text>`);
          x += c === sep ? 9 : 13.2;
        }
      }
      width = vx + boxW + 20;
      y0 = Math.max(bottom, y0 + 50);
    }
  }

  // The result, with a check.
  const lines: { s: string; color: string; size: number }[] = [];
  const divSign = corner ? ":" : "÷";
  if (done) {
    const last = plan.steps[plan.steps.length - 1];
    const q = quotientText(plan, sep);
    if (decimals === 0 && last.r) {
      const whole = Math.floor(a / b);
      lines.push({ s: `${a} ${divSign} ${b} = ${whole} ${sup(last.r)}⁄${sub(b)}`, color: INK, size: 22 });
      lines.push({ s: `${a} = ${b} × ${whole} + ${last.r}`, color: "#495057", size: 17 });
    } else {
      const approx = !plan.exact && plan.repeatFrom === null;
      lines.push({ s: `${a} ${divSign} ${b} ${approx ? "≈" : "="} ${q}${approx ? "…" : ""}`, color: INK, size: 22 });
      if (plan.exact && q.includes(sep) === false) lines.push({ s: `${b} × ${q} = ${a}`, color: "#495057", size: 17 });
    }
  } else {
    const s = shown[shown.length - 1];
    if (s) lines.push({ s: `${s.cur} ${divSign} ${b} → ${s.q}  ·  ${s.q} × ${b} = ${s.q * b}  ·  ${s.cur} − ${s.q * b} = ${s.r}`, color: "#495057", size: 17 });
  }
  let y = y0 + 34;
  for (const l of lines) {
    out.push(`<text x="16" y="${y}" ${SANS} font-size="${l.size}" fill="${l.color}" font-weight="${l.size > 20 ? 700 : 400}">${l.s}</text>`);
    y += l.size + 12;
  }
  const textW = Math.max(0, ...lines.map((l) => l.s.length * l.size * 0.55 + 32));
  const W = Math.ceil(Math.max(width, textW, 200));
  const H = Math.ceil(y);
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xml:space="preserve"><rect width="${W}" height="${H}" fill="#ffffff"/>${out.join("")}</svg>`,
    width: W,
    height: H,
  };
}
