// String matching for the Algorithms tool: the naive algorithm (every shift), Knuth–Morris–Pratt
// (prefix table, and shifts that skip what is already known to match) and Rabin–Karp (rolling hash,
// spurious hits checked character by character).
import type { AlgoWords, Steps, StringSpec } from "./algo";
import { cell, legendRow, table, txt, type Role } from "./algoArrays";
import { C, compose, fill, wrap, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

type Attempt = { s: number; roles: Role[]; note: string; color?: string };

/** The text on top, then the pattern under it at each shift tried, with a note on the right. */
function drawAttempts(text: string[], pat: string[], tries: Attempt[], y0: number): { svg: string; h: number } {
  const n = text.length;
  const cw = Math.min(26, Math.floor((W - 32 - 170) / n));
  const size = cw < 20 ? 11 : 13;
  const noteX = 16 + n * cw + 12;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) parts.push(txt(16 + i * cw + cw / 2, y0 + 10, String(i), { size: 9.5, color: C.grey, anchor: "middle" }));
  let y = y0 + 15;
  text.forEach((ch, i) => parts.push(cell(16 + i * cw + 1, y, cw - 2, 24, ch, "plain", size, true)));
  y += 32;
  for (const t of tries) {
    pat.forEach((ch, j) => parts.push(cell(16 + (t.s + j) * cw + 1, y, cw - 2, 22, ch, t.roles[j], size)));
    const lines = wrap(t.note, Math.max(16, Math.floor((W - noteX - 8) / 6.4)));
    lines.forEach((l, k) => parts.push(txt(noteX, y + 15 + (k - (lines.length - 1) / 2) * 14, l, { size: 11.5, color: t.color ?? "#495057" })));
    y += Math.max(27, lines.length * 14 + 6);
  }
  return { svg: parts.join(""), h: y - y0 };
}

export function renderString(spec: StringSpec, w: AlgoWords, st: Steps): RenderedSvg {
  const sw = w.str;
  const text = [...spec.text.replace(/\s+/g, " ").trim()];
  const pat = [...spec.pattern.replace(/\s+/g, " ").trim()];
  if (!text.length || !pat.length) throw new Error(sw.empty);
  if (text.length > 24 || pat.length > 8) throw new Error(sw.tooLong);
  if (pat.length > text.length) throw new Error(sw.patLonger);
  const [n, m] = [text.length, pat.length];
  const tries: Attempt[] = [];
  const found: number[] = [];
  const caps: Caption[] = [];
  let comps = 0;
  let extra = "";
  let extraH = 0;
  let tex = "";
  // Comparisons the naive algorithm makes, for comparison.
  let naive = 0;
  for (let s = 0; s + m <= n; s++) for (let j = 0; j < m; j++) if ((naive++, text[s + j] !== pat[j])) break;

  if (spec.algo === "naive") {
    for (let s = 0; s + m <= n; s++) {
      const roles: Role[] = Array(m).fill("idle");
      let j = 0;
      for (; j < m; j++) {
        comps++;
        if (text[s + j] !== pat[j]) {
          roles[j] = "min";
          break;
        }
        roles[j] = "sorted";
      }
      if (j === m) found.push(s);
      tries.push(j === m ? { s, roles, note: fill(sw.matchAt, { s }), color: C.green } : { s, roles, note: fill(sw.mismatch, { s, j, k: j + 1 }) });
    }
    tex = `\\text{${sw.shifts}: } 0 \\ldots n - m = ${n - m}`;
  } else if (spec.algo === "kmp") {
    // π[j]: the length of the longest proper prefix of pat[0..j] that is also a suffix of it.
    const pi = Array(m).fill(0);
    for (let j = 1, k = 0; j < m; j++) {
      while (k > 0 && pat[j] !== pat[k]) k = pi[k - 1];
      if (pat[j] === pat[k]) k++;
      pi[j] = k;
    }
    let i = 0;
    let j = 0;
    while (i < n) {
      const s = i - j;
      if (s + m > n) break;
      const roles: Role[] = Array(m).fill("idle");
      for (let k = 0; k < j; k++) roles[k] = "key";
      const known = j;
      let stop = false;
      while (!stop && i < n) {
        comps++;
        if (text[i] === pat[j]) {
          roles[j] = "sorted";
          i++;
          j++;
          if (j === m) {
            found.push(s);
            const note = `${fill(sw.matchAt, { s })} → j = π[${m - 1}] = ${pi[m - 1]}`;
            tries.push({ s, roles, note: known ? `${fill(sw.known, { k: known })} ${note}` : note, color: C.green });
            j = pi[m - 1];
            stop = true;
          }
        } else {
          roles[j] = "min";
          const note = j > 0 ? fill(sw.kmpShift, { j, p: pi[j - 1], d: j - pi[j - 1] }) : fill(sw.kmpStep, { s });
          tries.push({ s, roles, note: known ? `${fill(sw.known, { k: known })} ${note}` : note });
          if (j > 0) j = pi[j - 1];
          else i++;
          stop = true;
        }
      }
    }
    // The prefix table above the attempts.
    const colW = 30;
    const tb = table(16, 0, [{ head: "j", w: 44 }, ...pat.map((_, j) => ({ head: String(j), w: colW }))], [
      { cells: ["P", ...pat], bold: [true, ...pat.map(() => true)] },
      { cells: ["π", ...pi.map(String)], colors: [C.grey, ...pi.map((v) => (v ? C.blue : C.grey))], bold: [true, ...pi.map((v) => v > 0)] },
    ], 22);
    const px = 16 + 44 + m * colW + 14;
    const piLines = wrap(sw.piMeaning, Math.max(14, Math.floor((W - px - 10) / 6.2)));
    extra = tb.svg + piLines.map((l, k) => txt(px, 26 + k * 15, l, { size: 11.5, color: "#495057" })).join("");
    extraH = tb.h + 12;
    tex = `\\pi = [${pi.join(",\\ ")}]`;
  } else {
    // Rabin–Karp with h(s) = Σ code(c)·d^(m−1−i) mod q, updated in O(1) per shift.
    const d = 31;
    const q = 101;
    const code = (c: string) => c.codePointAt(0)! % q;
    const hash = (cs: string[]) => cs.reduce((h, c) => (h * d + code(c)) % q, 0);
    const hp = hash(pat);
    let hw = hash(text.slice(0, m));
    const high = Array.from({ length: m - 1 }).reduce<number>((x) => (x * d) % q, 1);
    const rows: { cells: string[]; colors: (string | undefined)[]; fills?: (string | undefined)[] }[] = [];
    let spurious = 0;
    for (let s = 0; s + m <= n; s++) {
      if (s > 0) hw = (((hw - code(text[s - 1]) * high) % q + q) % q * d + code(text[s + m - 1])) % q;
      const win = text.slice(s, s + m).join("");
      let result = "≠";
      let color: string | undefined = C.grey;
      if (hw === hp) {
        const same = win === pat.join("");
        comps += same ? m : (() => {
          let k = 0;
          while (k < m && text[s + k] === pat[k]) k++;
          return Math.min(m, k + 1);
        })();
        if (same) found.push(s), (result = `= → ✓ ${sw.match}`), (color = C.green);
        else spurious++, (result = `= → ✗ ${sw.spurious}`), (color = C.red);
      }
      rows.push({ cells: [String(s), win, String(hw), result], colors: [C.grey, C.ink, hw === hp ? C.orange : C.ink, color], fills: [undefined, undefined, hw === hp ? "#ffe8cc" : undefined, undefined] });
    }
    const tb = table(16, 0, [{ head: sw.cols.shift, w: 60 }, { head: sw.cols.window, w: 120 }, { head: "h", w: 60 }, { head: `h = ${hp}?`, w: 220 }], st.cut(rows, 0), 21);
    extra = tb.svg;
    extraH = tb.h + 4;
    tex = `h(P) = ${hp},\\quad h = \\sum c_i\\, ${d}^{m-1-i} \\bmod ${q},\\quad h_{s+1} = (h_s - c_s\\, ${d}^{m-1})\\cdot ${d} + c_{s+m}`;
    caps.push(...st.final({ text: fill(sw.rkStats, { k: rows.length, s: spurious }), color: spurious ? C.orange : C.blue }));
  }

  let body = extra;
  let h = extraH;
  if (spec.algo !== "rk") {
    const at = drawAttempts(text, pat, st.cut(tries, 0), h);
    body += at.svg;
    h += at.h;
    const l = legendRow(
      [
        { role: "sorted", text: sw.legend.match },
        { role: "min", text: sw.legend.mismatch },
        ...(spec.algo === "kmp" ? [{ role: "key" as Role, text: sw.legend.known }] : []),
        { role: "idle", text: sw.legend.skipped },
      ],
      h + 6,
    );
    body += l.svg;
    h += 6 + l.h;
    caps.push(...st.final({ text: spec.algo === "naive" ? fill(sw.compsNaive, { c: comps }) : fill(sw.comps, { c: comps, naive }), color: C.blue }));
  }
  caps.unshift(...st.final(found.length ? { text: fill(sw.found, { k: found.length, list: found.join(", ") }), color: C.green } : { text: sw.notFound, color: C.red }));
  caps.push({ text: sw.info[spec.algo], color: "#495057" });
  return compose(tex || "T,\\ P", body, h, caps);
}
