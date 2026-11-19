// Practice: Countable and uncountable. Easy picks the uncountable set among countable ones (ℚ taken for uncountable,
// named) or the countable one among uncountable ones ((0, 1) taken for countable, named); medium finds a place in a
// listing that shows a set countable: the integers as 0, 1, −1, 2, −2, … (the place of the opposite number named) or
// the pairs along the diagonals (counted from the other end, named); hard builds the first digits of Cantor's
// diagonal sequence for a list of 0–1 sequences (the diagonal unchanged, or the first sequence changed, named).
import {
  COUNTABLE,
  esc,
  intAtPlace,
  minus,
  option,
  placeOfInt,
  placeOfPair,
  SET_SYMBOLS,
  SET_WHY,
  shuffled,
  UNCOUNTABLE,
  type InfiniteSet,
} from "../logicSets";
import type { Exercise, Gen, Part, PracticeWords, Trap } from "../practiceTypes";

type Rng = Parameters<Gen>[0];
const g = (svg: string, w: number, h: number): Exercise["pic"] => ({ svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${svg}</g>`, h, w });
const nameOf = (s: InfiniteSet, w: PracticeWords) => SET_SYMBOLS[s] ?? w.logic.sets[s] ?? s;

/** One set unlike the other three: the uncountable one, or the countable one. */
export function whichPart(r: Rng, uncountable: boolean, w: PracticeWords): Part {
  const right = r.pick(uncountable ? UNCOUNTABLE : COUNTABLE);
  // ℚ among the countable ones and (0, 1) among the uncountable ones, always: the sets taken for the other kind.
  const bait: InfiniteSet = uncountable ? "Q" : "unit";
  const pool = (uncountable ? COUNTABLE : UNCOUNTABLE).filter((s) => s !== bait && s !== right);
  const sets = shuffled(r, [right, bait, ...shuffled(r, pool).slice(0, 2)]);
  const options = sets.map((s) => option(nameOf(s, w)));
  const traps: Trap[] = [{ id: uncountable ? "denseNotUncountable" : "boundedCountable", a: { k: "pick", options, right: sets.indexOf(bait) } }];
  const at = sets.indexOf(right);
  return {
    prompt: uncountable ? w.logic.prompt.uncountable : w.logic.prompt.countable,
    q: "",
    answer: { k: "pick", options, right: at, traps },
    show: `\\text{${options[at].text}}`,
    plain: options[at].plain,
    format: "pick",
    steps: [SET_WHY[right]],
  };
}

/** The list 0, 1, −1, 2, −2, … with its places. */
function intListPic(): Exercise["pic"] {
  const cells = Array.from({ length: 9 }, (_, i) => {
    const x = i * 40;
    return (
      `<text x="${x + 20}" y="14" text-anchor="middle" font-size="12" fill="#868e96">${i + 1}</text>` +
      `<rect x="${x + 2}" y="20" width="36" height="28" rx="4" fill="#e7f5ff" stroke="#1971c2"/>` +
      `<text x="${x + 20}" y="40" text-anchor="middle" font-size="15" fill="#1e1e1e">${esc(minus(intAtPlace(i + 1)))}</text>`
    );
  }).join("");
  return g(cells + `<text x="372" y="40" font-size="15" fill="#1e1e1e">…</text>`, 390, 52);
}

/** The place of an integer in the list, or the integer in a place. */
export function intPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const m = r.int(2, 12) * (r.next() < 0.5 ? 1 : -1);
    const v = placeOfInt(m);
    return {
      prompt: w.logic.prompt.zPlace,
      q: `m = ${m}`,
      pic: intListPic(),
      answer: { k: "num", v, tol: 1e-9, traps: [{ id: "signSwap", a: { k: "num", v: placeOfInt(-m), tol: 1e-9 }, vars: { v: placeOfInt(-m), y: minus(-m) } }] },
      show: `${v}`,
      plain: `${v}`,
      format: "number",
      steps: [m > 0 ? `${m} > 0:\\ 2 \\times ${m} = ${v}` : `${m} < 0:\\ 2 \\times ${-m} + 1 = ${v}`],
    };
  }
  const n = r.int(10, 30);
  const v = intAtPlace(n);
  return {
    prompt: w.logic.prompt.zValue,
    q: `n = ${n}`,
    pic: intListPic(),
    answer: { k: "num", v, tol: 1e-9 },
    show: `${v}`,
    plain: `${v}`,
    format: "number",
    steps: [n % 2 === 0 ? `\\tfrac{${n}}{2} = ${v}` : `-\\tfrac{${n} - 1}{2} = ${v}`],
  };
}

/** The pairs (a, b), a, b ≥ 1, as a grid with the first places numbered along the diagonals and the pair asked for marked. */
function pairsPic(a: number, b: number): Exercise["pic"] {
  const C = 44;
  const cx = (j: number) => 30 + (j - 1) * C;
  const cy = (i: number) => 30 + (i - 1) * C;
  let svg = "";
  for (let i = 1; i <= 5; i++) {
    svg += `<text x="10" y="${cy(i) + 5}" text-anchor="middle" font-size="12" fill="#868e96">${i}</text><text x="${cx(i)}" y="10" text-anchor="middle" font-size="12" fill="#868e96">${i}</text>`;
  }
  // Each diagonal an arrow from (1, d) down to (d, 1): the order the pairs are listed in.
  for (let d = 2; d <= 5; d++) {
    const [x1, y1, x2, y2] = [cx(d), cy(1), cx(1), cy(d)];
    const u = Math.SQRT1_2;
    const [ex, ey] = [x2 + u * 16, y2 - u * 16];
    svg += `<line x1="${x1 - u * 16}" y1="${y1 + u * 16}" x2="${ex}" y2="${ey}" stroke="#74c0fc" stroke-width="3"/>`;
    svg += `<polygon points="${ex - u * 2},${ey + u * 2} ${ex + u * 10 + u * 6},${ey - u * 10 + u * 6} ${ex + u * 10 - u * 6},${ey - u * 10 - u * 6}" fill="#74c0fc"/>`;
  }
  for (let i = 1; i <= 5; i++)
    for (let j = 1; j <= 5; j++) {
      const p = placeOfPair(i, j);
      const asked = i === a && j === b;
      svg += `<circle cx="${cx(j)}" cy="${cy(i)}" r="13" fill="${asked ? "#fff3bf" : "#fff"}" stroke="${asked ? "#f08c00" : "#1971c2"}" stroke-width="2"/>`;
      svg += `<text x="${cx(j)}" y="${cy(i) + 5}" text-anchor="middle" font-size="13" fill="#1e1e1e">${p <= 6 ? p : asked ? "?" : ""}</text>`;
    }
  return g(svg, 30 + 4 * C + 20, 30 + 4 * C + 20);
}

/** The place of a pair in the diagonal listing. */
export function pairPart(a: number, b: number, w: PracticeWords): Part {
  const d = a + b - 1;
  const v = placeOfPair(a, b);
  const back = (d * (d - 1)) / 2 + b;
  return {
    prompt: w.logic.prompt.pairs,
    q: `(a, b) = (${a}, ${b})`,
    pic: pairsPic(a, b),
    answer: { k: "num", v, tol: 1e-9, traps: a === b ? [] : [{ id: "diagonalDirection", a: { k: "num", v: back, tol: 1e-9 }, vars: { d, e: d - 1 } }] },
    show: `${v}`,
    plain: `${v}`,
    format: "number",
    steps: [`a + b - 1 = ${d}`, `\\tfrac{${d}(${d} - 1)}{2} + ${a} = ${v}`],
  };
}

/** The list of sequences, the k-th digit of the k-th marked. */
function diagonalPic(rows: number[][]): Exercise["pic"] {
  const C = 30;
  let svg = "";
  rows.forEach((row, i) => {
    svg += `<text x="16" y="${30 + i * C + 5}" text-anchor="middle" font-size="14" font-style="italic" fill="#495057">s${"₁₂₃₄₅"[i]}</text>`;
    row.forEach((d, j) => {
      const on = i === j;
      svg += `<rect x="${36 + j * C}" y="${30 + i * C - 14}" width="${C - 4}" height="${C - 4}" rx="4" fill="${on ? "#fff3bf" : "#f8f9fa"}" stroke="${on ? "#f08c00" : "#dee2e6"}"/>`;
      svg += `<text x="${36 + j * C + (C - 4) / 2}" y="${30 + i * C + 5}" text-anchor="middle" font-size="15" fill="#1e1e1e">${d}</text>`;
    });
    svg += `<text x="${36 + row.length * C + 4}" y="${30 + i * C + 5}" font-size="15" fill="#1e1e1e">…</text>`;
  });
  return g(svg, 36 + rows[0].length * C + 24, 30 + rows.length * C);
}

/** Cantor's diagonal: the first five digits of a 0–1 sequence that is in no place of the list. */
export function diagonalPart(rows: number[][], w: PracticeWords): Part {
  const diag = rows.map((row, i) => row[i]);
  const vs = diag.map((d) => 1 - d);
  const same = (a: number[], b: number[]) => a.every((x, i) => x === b[i]);
  const row1 = rows[0].slice(0, 5).map((d) => 1 - d);
  const traps: Trap[] = [{ id: "diagonalNotFlipped", a: { k: "tuple", vs: diag, tol: 1e-9 } }];
  if (!same(row1, vs) && !same(row1, diag)) traps.push({ id: "flippedRow", a: { k: "tuple", vs: row1, tol: 1e-9 } });
  return {
    prompt: w.logic.prompt.diagonal,
    q: "",
    pic: diagonalPic(rows),
    answer: { k: "tuple", vs, tol: 1e-9, traps },
    show: vs.join(",\\ "),
    plain: vs.join(", "),
    format: "bits",
    steps: [`${diag.join("\\,")}\\ \\to\\ ${vs.join("\\,")}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return whichPart(r, r.next() < 0.5, w);
  if (L === 2) {
    if (r.next() < 0.5) return intPart(r, w);
    for (;;) {
      const [a, b] = [r.int(1, 5), r.int(1, 5)];
      if (a + b >= 5) return pairPart(a, b, w);
    }
  }
  return diagonalPart(
    Array.from({ length: 5 }, () => Array.from({ length: 7 }, () => (r.next() < 0.5 ? 0 : 1))),
    w,
  );
};

export default gen;
