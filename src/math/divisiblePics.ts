// The worked picture for "divisible by?": one row for each divisor offered. The number's digits as tiles, the ones the
// test looks at outlined: the last one, two or three (orange) for 2, 5, 10, 4 and 8, with the rest split off grey (a
// whole number of tens, hundreds or thousands, which the divisor always goes into); every digit (blue) for 3 and 9,
// whose digit sum is drawn as dots in threes or nines, the dots left over red. Beside them the check: the endings that
// work for 2, 5 and 10 with the last digit's one green; the last digits as so many fours or eights, any remainder red;
// for 6, the rows for 2 and 3 together. A ✓ or ✗ ends each row, and underneath the divisors offered, those that work green.
import { C, FONT, r2 } from "./chart";

export type DivSolution = { n: number; offered: number[] };

/** How the test for d reads the number: its last k digits, its digit sum, or (for 6) the tests for 2 and 3. */
export const divLook = (d: number): { by: "end"; k: number } | { by: "sum" } | { by: "both" } =>
  d === 3 || d === 9 ? { by: "sum" } : d === 6 ? { by: "both" } : { by: "end", k: d === 4 ? 2 : d === 8 ? 3 : 1 };
/** The endings that make a number divide by 2, 5 or 10. */
export const ENDINGS: Record<number, number[]> = { 2: [0, 2, 4, 6, 8], 5: [0, 5], 10: [0] };
const digitSum = (n: number) => String(n).split("").reduce((s, c) => s + Number(c), 0);

function text(x: number, y: number, s: string, size: number, color: string = C.ink, bold = false, anchor = "middle") {
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}"${bold ? ' font-weight="700"' : ""}>${s}</text>`;
}
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, sw = 1.5) =>
  `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
/** a = d × q + r, the remainder red (left out when nothing is over). */
const split = (x: number, y: number, a: number, d: number) => {
  const [q, r] = [Math.floor(a / d), a % d];
  const color = r ? C.ink : C.green;
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="16" fill="${color}" font-weight="700">${a} = ${d} × ${q}${r ? ` <tspan fill="${C.red}">+ ${r}</tspan>` : ""}</text>`;
};

const [TW, TH, RH, X0] = [28, 34, 66, 74];

export function divisibleSvg(s: DivSolution): { body: string; w: number; h: number } {
  const digits = String(s.n).split("");
  const xc = X0 + digits.length * (TW + 2) + 36;
  const out: string[] = [];
  const ok = (d: number) => s.n % d === 0;
  s.offered.forEach((d, i) => {
    const y = 8 + i * RH;
    const look = divLook(d);
    if (ok(d)) out.push(`<rect x="0" y="${y - 4}" width="600" height="${RH - 6}" rx="8" fill="#ebfbee"/>`);
    out.push(box(8, y + 4, 54, 30, "#ffffff", ok(d) ? C.green : C.grey, 2), text(35, y + 25, `÷ ${d}`, 17, ok(d) ? C.green : C.ink, true));
    const mid = y + 25;
    if (look.by === "both") {
      // 6: the rows for 2 and for 3, together.
      out.push(text(X0, mid, [2, 3].map((e) => `<tspan fill="${ok(e) ? C.green : C.red}">÷ ${e} ${ok(e) ? "✓" : "✗"}</tspan>`).join(" + "), 17, C.ink, true, "start"));
    } else {
      // The digits, those the test looks at outlined.
      const k = look.by === "end" ? Math.min(look.k, digits.length) : digits.length;
      const lead = digits.length - k;
      digits.forEach((c, j) => {
        const x = X0 + j * (TW + 2);
        const tested = j >= lead;
        const [fill, stroke] = !tested ? ["#f1f3f5", "#ced4da"] : look.by === "end" ? ["#fff4e6", C.orange] : ["#e7f5ff", C.blue];
        out.push(box(x, y + 2, TW, TH, fill, stroke, tested ? 2 : 1), text(x + TW / 2, y + 26, c, 20, tested ? C.ink : C.grey, tested));
      });
      const under = y + TH + 18;
      if (look.by === "end" && lead > 0) {
        // The rest is whole tens, hundreds or thousands: it always divides.
        const p = 10 ** k;
        out.push(`<text x="${X0}" y="${under}" font-size="12" fill="${C.grey}">${s.n - (s.n % p)} + <tspan fill="${C.orange}" font-weight="700">${String(s.n % p).padStart(k, "0")}</tspan></text>`);
      }
      if (look.by === "sum") out.push(text(X0, under, `${digits.join(" + ")} = ${digitSum(s.n)}`, 12, C.blue, true, "start"));
      if (look.by === "end" && look.k === 1) {
        // The endings that work, the one this number has green.
        const last = s.n % 10;
        out.push(text(xc - 18, mid, "→", 18, C.grey));
        ENDINGS[d].forEach((e, j) => {
          const x = xc + j * 30;
          out.push(box(x, y + 7, 24, 26, e === last ? C.green : "#ffffff", e === last ? C.green : C.grey), text(x + 12, mid, String(e), 16, e === last ? "#ffffff" : C.grey, true));
        });
      } else if (look.by === "end") {
        const p = 10 ** look.k;
        out.push(text(xc - 18, mid, "→", 18, C.grey), split(xc, mid, s.n % p, d));
      } else {
        // The digit sum as dots: threes in columns, nines in squares; what is over red.
        const sum = digitSum(s.n);
        const per = d === 3 ? 1 : 3;
        const groups = Math.floor(sum / d);
        const dot = (x: number, yy: number, color: string) => `<circle cx="${r2(x)}" cy="${r2(yy)}" r="3" fill="${color}"/>`;
        let x = xc;
        for (let g = 0; g <= groups; g++) {
          const count = g < groups ? d : sum % d;
          if (!count) break;
          for (let j = 0; j < count; j++) out.push(dot(x + Math.floor(j / 3) * 8, y + 11 + (j % 3) * 8, g < groups ? C.blue : C.red));
          if (g < groups) out.push(`<rect x="${r2(x - 5)}" y="${y + 5}" width="${per * 8 + 2}" height="28" rx="4" fill="none" stroke="#a5d8ff"/>`);
          x += per * 8 + 6;
        }
        out.push(split(x + 10, mid, sum, d));
      }
    }
    out.push(text(578, mid + 2, ok(d) ? "✓" : "✗", 24, ok(d) ? C.green : C.red, true));
  });
  // The answer: the divisors offered, those that work green.
  const y = 14 + s.offered.length * RH;
  out.push(text(8, y + 22, String(s.n), 20, C.ink, true, "start"));
  const x0 = 24 + String(s.n).length * 12;
  s.offered.forEach((d, j) => {
    const x = x0 + j * 50;
    out.push(box(x, y, 42, 32, ok(d) ? C.green : "#ffffff", ok(d) ? C.green : "#ced4da"), text(x + 21, y + 22, `÷${d}`, 15, ok(d) ? "#ffffff" : "#adb5bd", true));
    if (!ok(d)) out.push(`<line x1="${x + 6}" y1="${y + 26}" x2="${x + 36}" y2="${y + 6}" stroke="#adb5bd" stroke-width="1.5"/>`);
  });
  return { body: out.join(""), w: 600, h: y + 44 };
}

export function renderDivisible(spec: DivSolution) {
  const pic = divisibleSvg(spec);
  const w = pic.w + 20;
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${pic.h}" viewBox="0 0 ${w} ${pic.h}"><rect width="${w}" height="${pic.h}" fill="#ffffff"/><g ${FONT} transform="translate(10 0)">${pic.body}</g></svg>`,
    width: w,
    height: pic.h,
  };
}
