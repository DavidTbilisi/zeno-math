// Categorical syllogisms: two premises and a conclusion of the forms All / No / Some / Some … not, typed in
// English, Russian or Georgian (or as a mood and figure such as EIO-2, or a medieval name such as Ferio). The
// tool finds the three terms, the mood and the figure, draws the premises on a three-circle Venn diagram next
// to what the conclusion needs, and judges validity two ways that always agree: by every way the eight regions
// can be empty or not, and by the rules of the syllogism. With no conclusion typed it lists what does follow.
import { C, esc, fill, FONT, r2, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";
import type { LogicSpec } from "./logic";
import { composeText, tw } from "./logicPuzzles";

export type Form = "A" | "E" | "I" | "O";
export type SylRule = "middle" | "major" | "minor" | "exclusive" | "affNeg" | "negAff" | "existential";
export const SYL_RULES: SylRule[] = ["middle", "major", "minor", "exclusive", "affNeg", "negAff", "existential"];

export type SylWords = {
  /** Each form with {s} and {p}; read back by the parser, so they must match one of its patterns. */
  forms: Record<Form, string>;
  roles: { major: string; minor: string; concl: string };
  need2: string;
  badLine: string;
  terms: string;
  noMiddle: string;
  sameTerm: string;
  swapped: string;
  premisesTitle: string;
  conclusionTitle: string;
  title: string;
  titleOpen: string;
  valid: string;
  validBecause: string;
  validIf: string;
  invalid: string;
  named: string;
  rules: Record<SylRule, string>;
  follows: string;
  followsNone: string;
  legend: string;
};

/** One statement: its form, subject and predicate as typed, and where they sit in the line (for colouring). */
export type Stmt = { form: Form; s: string; p: string; raw: string; sAt: number; pAt: number };

// ---------- reading statements ----------

// O before I (its pattern is I's with a "not"), and every language's copula spelled out: Russian and Georgian
// often drop it in speech, but a categorical statement needs it to say where the subject ends.
const PATTERNS: [Form, RegExp][] = [
  ["O", /^some\s+(.+?)\s+(?:are|is)\s+not\s+(.+)$/iu],
  ["I", /^some\s+(.+?)\s+(?:are|is)\s+(.+)$/iu],
  ["E", /^no\s+(.+?)\s+(?:are|is)\s+(.+)$/iu],
  ["A", /^(?:all|every|each)\s+(.+?)\s+(?:are|is)\s+(.+)$/iu],
  ["O", /^некоторые\s+(.+?)\s+не\s+(?:есть|являются|является)\s+(.+)$/iu],
  ["O", /^некоторые\s+(.+?)\s+[—-]\s+не\s+(.+)$/iu],
  ["I", /^некоторые\s+(.+?)\s+(?:есть|являются|является|[—-])\s+(.+)$/iu],
  ["E", /^ни\s+(?:один|одна|одно|одни)\s+(.+?)\s+не\s+(?:есть|является|являются)\s+(.+)$/iu],
  ["A", /^(?:все|всякий|всякая|всякое|каждый|каждая|каждое)\s+(.+?)\s+(?:есть|являются|является|[—-])\s+(.+)$/iu],
  ["O", /^(?:ზოგი|ზოგიერთი)\s+(.+?)\s+არ\s+არის\s+(.+)$/u],
  ["I", /^(?:ზოგი|ზოგიერთი)\s+(.+?)\s+არის\s+(.+)$/u],
  ["E", /^(?:არცერთი|არც\s+ერთი)\s+(.+?)\s+არ\s+არის\s+(.+)$/u],
  ["A", /^ყველა\s+(.+?)\s+არის\s+(.+)$/u],
];

// Line numbers and "so" words in front of a statement, and a full stop after it.
const LEAD = /^(?:\d+[.)]\s*|∴\s*|(?:so|therefore|hence|thus|следовательно|значит|итак|ამიტომ|მაშასადამე|ესე\s+იგი)\s*,?\s+)+/iu;

export function parseStatement(line: string, w: SylWords): Stmt {
  const raw = line.trim().replace(LEAD, "").replace(/[.!;]+$/u, "").trim();
  for (const [form, re] of PATTERNS) {
    const m = re.exec(raw);
    if (!m) continue;
    const s = m[1].trim();
    const p = m[2].trim();
    return { form, s, p, raw, sAt: raw.indexOf(s, raw.indexOf(" ")), pAt: raw.lastIndexOf(p) };
  }
  throw new Error(fill(w.badLine, { s: line.trim() }));
}

/** The same term however it is capitalised or spaced. */
const key = (t: string) => t.toLowerCase().replace(/\s+/g, " ");

// ---------- moods, figures and names ----------

export type Figure = 1 | 2 | 3 | 4;
/** Where the middle term sits: [major premise, minor premise], each as [subject, predicate]. */
const FIGURE_TERMS: Record<Figure, [["M" | "P", "M" | "P"], ["S" | "M", "S" | "M"]]> = {
  1: [["M", "P"], ["S", "M"]],
  2: [["P", "M"], ["S", "M"]],
  3: [["M", "P"], ["M", "S"]],
  4: [["P", "M"], ["M", "S"]],
};

/** The medieval names: the vowels spell the mood. The 15 valid in any reading, then the 9 that need a non-empty term. */
export const NAMES: Record<string, string> = {
  "AAA-1": "Barbara", "EAE-1": "Celarent", "AII-1": "Darii", "EIO-1": "Ferio",
  "EAE-2": "Cesare", "AEE-2": "Camestres", "EIO-2": "Festino", "AOO-2": "Baroco",
  "IAI-3": "Disamis", "AII-3": "Datisi", "OAO-3": "Bocardo", "EIO-3": "Ferison",
  "AEE-4": "Camenes", "IAI-4": "Dimaris", "EIO-4": "Fresison",
  "AAI-1": "Barbari", "EAO-1": "Celaront", "EAO-2": "Cesaro", "AEO-2": "Camestros",
  "AAI-3": "Darapti", "EAO-3": "Felapton", "AAI-4": "Bramantip", "EAO-4": "Fesapo", "AEO-4": "Calemos",
};
const CODE_OF_NAME = new Map(Object.entries(NAMES).map(([code, name]) => [name.toLowerCase(), code]));

/** "EIO-2", "eio2" or "Festino" as the three statements, written with the letters S, P and M. */
function fromCode(src: string, w: SylWords): { premises: string[]; conclusion: string } | undefined {
  const code = CODE_OF_NAME.get(src.trim().toLowerCase()) ?? src.trim().toUpperCase().replace(/\s+/g, "");
  const m = /^([AEIO])([AEIO])([AEIO])-?([1-4])$/.exec(code);
  if (!m) return undefined;
  const [maj, min] = FIGURE_TERMS[Number(m[4]) as Figure];
  const say = (form: string, s: string, p: string) => fill(w.forms[form as Form], { s, p });
  return { premises: [say(m[1], ...maj), say(m[2], ...min)], conclusion: say(m[3], "S", "P") };
}

// ---------- the analysis ----------

type T = "S" | "P" | "M";
const BIT: Record<T, number> = { S: 1, P: 2, M: 4 };
export type Syllogism = {
  major: Stmt;
  minor: Stmt;
  concl?: Stmt;
  /** The terms as first typed. */
  names: Record<T, string>;
  figure: Figure;
  mood: string;
  code: string;
  swapped: boolean;
};

const termOf = (st: Stmt, keys: Record<T, string>, side: "s" | "p"): T => (Object.keys(keys) as T[]).find((t) => keys[t] === key(st[side]))!;

export function readSyllogism(premisesSrc: string, conclusionSrc: string, w: SylWords): Syllogism {
  let lines = premisesSrc.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let conclLine = conclusionSrc.trim();
  const coded = lines.length === 1 && !conclLine ? fromCode(lines[0], w) : undefined;
  if (coded) [lines, conclLine] = [coded.premises, coded.conclusion];
  if (lines.length !== 2) throw new Error(w.need2);
  let [first, second] = lines.map((l) => parseStatement(l, w));
  const concl = conclLine ? parseStatement(conclLine, w) : undefined;
  for (const st of concl ? [first, second, concl] : [first, second]) {
    if (key(st.s) === key(st.p)) throw new Error(fill(w.sameTerm, { s: st.s }));
  }
  const shared = [key(first.s), key(first.p)].filter((k) => k === key(second.s) || k === key(second.p));
  const listOf = (sts: Stmt[]) => [...new Map(sts.flatMap((st) => [st.s, st.p]).map((t) => [key(t), t])).values()].join(", ");
  if (!shared.length) throw new Error(fill(w.noMiddle, { list: listOf([first, second]) }));
  let keys: Record<T, string>;
  let swapped = false;
  if (concl) {
    const S = key(concl.s);
    const P = key(concl.p);
    const all = [first, second, concl].flatMap((st) => [key(st.s), key(st.p)]);
    const count = (k: string) => all.filter((x) => x === k).length;
    const M = shared.find((k) => k !== S && k !== P);
    if (new Set(all).size !== 3 || !M || ![S, P, M].every((k) => count(k) === 2)) {
      throw new Error(fill(w.terms, { list: listOf([first, second, concl]) }));
    }
    keys = { S, P, M };
    // The major premise is the one with the major term P; it comes first.
    if (key(first.s) !== P && key(first.p) !== P) {
      [first, second] = [second, first];
      swapped = true;
    }
  } else {
    if (shared.length !== 1) throw new Error(fill(w.terms, { list: listOf([first, second]) }));
    const M = shared[0];
    const other = (st: Stmt) => (key(st.s) === M ? key(st.p) : key(st.s));
    keys = { S: other(second), P: other(first), M };
  }
  const names = Object.fromEntries(
    (Object.keys(keys) as T[]).map((t) => [t, [first, second, ...(concl ? [concl] : [])].flatMap((st) => [st.s, st.p]).find((x) => key(x) === keys[t])!]),
  ) as Record<T, string>;
  const mPos = (st: Stmt) => (termOf(st, keys, "s") === "M" ? "s" : "p");
  const figure = (({ ss: 3, sp: 1, ps: 4, pp: 2 }) as const)[`${mPos(first)}${mPos(second)}` as "ss" | "sp" | "ps" | "pp"];
  const mood = first.form + second.form + (concl?.form ?? "");
  return { major: first, minor: second, concl, names, figure, mood, code: `${mood}-${figure}`, swapped };
}

// ---------- the model: which of the eight regions are empty ----------

/** A statement about two terms as bits: S = 1, P = 2, M = 4. A region is a set of those bits. */
type Claim = { form: Form; x: number; y: number };
const claimOf = (st: Stmt, syl: Syllogism): Claim => {
  const keys = Object.fromEntries((Object.keys(syl.names) as T[]).map((t) => [t, key(syl.names[t])])) as Record<T, string>;
  return { form: st.form, x: BIT[termOf(st, keys, "s")], y: BIT[termOf(st, keys, "p")] };
};

/** The regions a claim talks about: X-and-Y for E and I, X-but-not-Y for A and O. */
export const regionsOf = (c: Claim) => [0, 1, 2, 3, 4, 5, 6, 7].filter((r) => (r & c.x) !== 0 && ((r & c.y) !== 0) === (c.form === "E" || c.form === "I"));
const universal = (f: Form) => f === "A" || f === "E";
const negative = (f: Form) => f === "E" || f === "O";

/** Does the claim hold when `ne` (a bit per region) says which regions have something in them? */
const holds = (c: Claim, ne: number) => regionsOf(c).some((r) => (ne >> r) & 1) !== universal(c.form);

/** True when every way of filling the regions that keeps the premises (and the terms in `exist` non-empty) keeps the conclusion. */
export function follows(premises: Claim[], concl: Claim, exist: number): boolean {
  for (let ne = 0; ne < 256; ne++) {
    if (!premises.every((c) => holds(c, ne))) continue;
    if ([1, 2, 4].some((t) => exist & t && ![0, 1, 2, 3, 4, 5, 6, 7].some((r) => r & t && (ne >> r) & 1))) continue;
    if (!holds(concl, ne)) return false;
  }
  return true;
}

// ---------- the rules ----------

/** Is the term covered in full by the statement? A distributes its subject, E both, I neither, O its predicate. */
const distributes = (c: Claim, bit: number) =>
  (c.x === bit && (c.form === "A" || c.form === "E")) || (c.y === bit && (c.form === "E" || c.form === "O"));

/** The rules a syllogism breaks. With `aristotle` (no term is empty) the existential fallacy is no fallacy. */
export function brokenRules(major: Claim, minor: Claim, concl: Claim, aristotle: boolean): SylRule[] {
  const out: SylRule[] = [];
  if (!distributes(major, BIT.M) && !distributes(minor, BIT.M)) out.push("middle");
  if (distributes(concl, BIT.P) && !distributes(major, BIT.P)) out.push("major");
  if (distributes(concl, BIT.S) && !distributes(minor, BIT.S)) out.push("minor");
  if (negative(major.form) && negative(minor.form)) out.push("exclusive");
  if ((negative(major.form) || negative(minor.form)) && !negative(concl.form)) out.push("affNeg");
  if (negative(concl.form) && !negative(major.form) && !negative(minor.form)) out.push("negAff");
  if (!aristotle && universal(major.form) && universal(minor.form) && !universal(concl.form)) out.push("existential");
  return out;
}

/** A syllogism given by its mood and figure, as claims about S, P and M. */
export function claimsOf(code: string): [Claim, Claim, Claim] {
  const [, a, b, c, f] = /^([AEIO])([AEIO])([AEIO])-([1-4])$/.exec(code)!;
  const [maj, min] = FIGURE_TERMS[Number(f) as Figure];
  return [
    { form: a as Form, x: BIT[maj[0]], y: BIT[maj[1]] },
    { form: b as Form, x: BIT[min[0]], y: BIT[min[1]] },
    { form: c as Form, x: BIT.S, y: BIT.P },
  ];
}

// ---------- drawing ----------

const R = 64;
const CENTRES: Record<T, [number, number]> = { S: [-40, -26], P: [40, -26], M: [0, 42] };
const TERM_COLOR: Record<T, string> = { S: C.blue, P: C.orange, M: C.green };
const SHADE = "#adb5bd";
const inside = (t: T, x: number, y: number) => (x - CENTRES[t][0]) ** 2 + (y - CENTRES[t][1]) ** 2 <= R * R;

/** The middle of each region, by averaging a grid of points (offsets from the diagram's centre). */
const CENTROIDS: [number, number][] = (() => {
  const sum = Array.from({ length: 8 }, () => [0, 0, 0]);
  for (let x = -110; x <= 110; x += 2) {
    for (let y = -95; y <= 110; y += 2) {
      const r = (inside("S", x, y) ? 1 : 0) | (inside("P", x, y) ? 2 : 0) | (inside("M", x, y) ? 4 : 0);
      sum[r][0] += x;
      sum[r][1] += y;
      sum[r][2]++;
    }
  }
  return sum.map(([x, y, n]) => [x / n, y / n]);
})();

/** Where to put the X of a "some" claim: in the one region left open, or on the line between two. Two premises
 *  of a syllogism never shade both of the other's regions (they are about different pairs of terms), so one is open. */
function xMark(c: Claim, shaded: Set<number>): [number, number] {
  const pick = regionsOf(c).filter((r) => !shaded.has(r));
  if (pick.length === 1) return CENTROIDS[pick[0]];
  const third = ((["S", "P", "M"] as T[]).find((t) => (pick[0] ^ pick[1]) === BIT[t]))!;
  const [mx, my] = [(CENTROIDS[pick[0]][0] + CENTROIDS[pick[1]][0]) / 2, (CENTROIDS[pick[0]][1] + CENTROIDS[pick[1]][1]) / 2];
  const [cx, cy] = CENTRES[third];
  const d = Math.hypot(mx - cx, my - cy);
  return [cx + (R * (mx - cx)) / d, cy + (R * (my - cy)) / d];
}

const short = (s: string, n = 16) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** A three-circle Venn diagram with some regions shaded empty and some X marks. */
function venn3(ox: number, oy: number, shaded: Set<number>, marks: [number, number][], names: Record<T, string>, id: string): string {
  const ux = ox - 128;
  const uy = oy - 112;
  const uw = 256;
  const uh = 252;
  const defs: string[] = [];
  const parts: string[] = [];
  (["S", "P", "M"] as T[]).forEach((t) => defs.push(`<clipPath id="${id}${t}"><circle cx="${r2(ox + CENTRES[t][0])}" cy="${r2(oy + CENTRES[t][1])}" r="${R}"/></clipPath>`));
  for (const r of [...shaded].sort()) {
    const ins = (["S", "P", "M"] as T[]).filter((t) => r & BIT[t]);
    const outs = (["S", "P", "M"] as T[]).filter((t) => !(r & BIT[t]));
    defs.push(
      `<mask id="${id}m${r}"><rect x="${ux}" y="${uy}" width="${uw}" height="${uh}" fill="#ffffff"/>` +
        outs.map((t) => `<circle cx="${r2(ox + CENTRES[t][0])}" cy="${r2(oy + CENTRES[t][1])}" r="${R}" fill="#000000"/>`).join("") +
        `</mask>`,
    );
    let region = `<rect x="${ux}" y="${uy}" width="${uw}" height="${uh}" fill="${SHADE}" fill-opacity="0.8" mask="url(#${id}m${r})"/>`;
    for (const t of ins) region = `<g clip-path="url(#${id}${t})">${region}</g>`;
    parts.push(region);
  }
  parts.push(`<rect x="${ux}" y="${uy}" width="${uw}" height="${uh}" rx="6" fill="none" stroke="#495057" stroke-width="1.4"/>`);
  (["S", "P", "M"] as T[]).forEach((t) => {
    const [cx, cy] = [ox + CENTRES[t][0], oy + CENTRES[t][1]];
    parts.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${R}" fill="none" stroke="${TERM_COLOR[t]}" stroke-width="2.2"/>`);
    const [lx, ly, anchor] = t === "S" ? [cx - 20, cy - R - 8, "middle"] : t === "P" ? [cx + 20, cy - R - 8, "middle"] : [cx, cy + R + 18, "middle"];
    parts.push(`<text x="${r2(lx)}" y="${r2(ly)}" text-anchor="${anchor}" ${FONT} font-size="14" font-weight="700" fill="${TERM_COLOR[t]}">${esc(short(names[t]))}</text>`);
  });
  for (const m of marks) {
    parts.push(`<text x="${r2(ox + m[0])}" y="${r2(oy + m[1] + 8)}" text-anchor="middle" ${FONT} font-size="22" font-weight="700" fill="${C.ink}">X</text>`);
  }
  return `<defs>${defs.join("")}</defs>${parts.join("")}`;
}

/** What a set of claims draws: the regions the universal ones empty, and an X for each particular one. */
function drawn(claims: Claim[]): { shaded: Set<number>; marks: [number, number][] } {
  const shaded = new Set(claims.filter((c) => universal(c.form)).flatMap(regionsOf));
  return { shaded, marks: claims.filter((c) => !universal(c.form)).map((c) => xMark(c, shaded)) };
}

/** One statement in a line, its terms in their circle's colour and underlined where the statement distributes them. */
function statementLine(y: number, badge: string, st: Stmt, c: Claim, t: [T, T], role: string): string {
  const pieces: { text: string; color?: string; under?: boolean }[] = [
    { text: st.raw.slice(0, st.sAt) },
    { text: st.s, color: TERM_COLOR[t[0]], under: distributes(c, c.x) },
    { text: st.raw.slice(st.sAt + st.s.length, st.pAt) },
    { text: st.p, color: TERM_COLOR[t[1]], under: distributes(c, c.y) },
    { text: st.raw.slice(st.pAt + st.p.length) },
  ];
  const label = `${st.form} · ${role}`;
  const room = W - 70 - tw(label, 13) - 30;
  const size = Math.max(10, Math.min(16, (16 * room) / Math.max(1, tw(st.raw, 16))));
  const spans = pieces
    .filter((p) => p.text)
    .map((p) => `<tspan${p.color ? ` fill="${p.color}" font-weight="700"` : ""}${p.under ? ` text-decoration="underline"` : ""}>${esc(p.text)}</tspan>`)
    .join("");
  return (
    `<text x="40" y="${y}" text-anchor="middle" ${FONT} font-size="15" font-weight="700" fill="${C.grey}">${esc(badge)}</text>` +
    `<text x="62" y="${y}" ${FONT} font-size="${r2(size)}" fill="${C.ink}">${spans}</text>` +
    `<text x="${W - 24}" y="${y}" text-anchor="end" ${FONT} font-size="13" fill="${C.grey}">${esc(label)}</text>`
  );
}

// ---------- the tool ----------

export function renderSyllogism(spec: LogicSpec, w: SylWords): RenderedSvg {
  const syl = readSyllogism(spec.f, spec.g, w);
  const aristotle = spec.exist === true;
  const major = claimOf(syl.major, syl);
  const minor = claimOf(syl.minor, syl);
  const concl = syl.concl && claimOf(syl.concl, syl);
  const tOf = (c: Claim): [T, T] => [(["S", "P", "M"] as T[]).find((t) => BIT[t] === c.x)!, (["S", "P", "M"] as T[]).find((t) => BIT[t] === c.y)!];

  const parts: string[] = [];
  parts.push(statementLine(22, "1", syl.major, major, tOf(major), w.roles.major));
  parts.push(statementLine(54, "2", syl.minor, minor, tOf(minor), w.roles.minor));
  if (syl.concl && concl) {
    parts.push(`<line x1="28" y1="68" x2="${W - 24}" y2="68" stroke="${C.ink}" stroke-width="1.4"/>`);
    parts.push(statementLine(92, "∴", syl.concl, concl, tOf(concl), w.roles.concl));
  }
  const cy = 236;
  const prem = drawn([major, minor]);
  const xs = concl ? [W / 2 - 150, W / 2 + 150] : [W / 2];
  parts.push(venn3(xs[0], cy, prem.shaded, prem.marks, syl.names, "sp"));
  parts.push(`<text x="${xs[0]}" y="${cy + 160}" text-anchor="middle" ${FONT} font-size="14" font-weight="700" fill="${C.ink}">${esc(w.premisesTitle)}</text>`);
  if (concl) {
    const need = drawn([concl]);
    parts.push(venn3(xs[1], cy, need.shaded, need.marks, syl.names, "sc"));
    parts.push(`<text x="${xs[1]}" y="${cy + 160}" text-anchor="middle" ${FONT} font-size="14" font-weight="700" fill="${C.ink}">${esc(w.conclusionTitle)}</text>`);
  }

  const caps: Caption[] = [];
  const all = aristotle ? 7 : 0;
  const S = syl.names.S;
  const P = syl.names.P;
  const sayAll = (f: Form) => fill(w.forms[f], { s: S, p: P });
  if (concl) {
    const ok = follows([major, minor], concl, all);
    const broken = brokenRules(major, minor, concl, aristotle);
    const needs = (["S", "M", "P"] as T[]).filter((t) => follows([major, minor], concl, BIT[t]));
    if (ok) {
      const helped = aristotle && !follows([major, minor], concl, 0);
      caps.push({ text: helped ? fill(w.validBecause, { t: syl.names[needs[0]] }) : w.valid, color: C.green });
    } else if (needs.length) {
      caps.push({ text: fill(w.validIf, { t: syl.names[needs[0]] }), color: C.orange });
    } else {
      caps.push({ text: w.invalid, color: C.red });
    }
    if (NAMES[syl.code] && (ok || needs.length)) caps.push({ text: fill(w.named, { code: syl.code, name: NAMES[syl.code] }), color: C.blue });
    for (const r of broken) caps.push({ text: fill(w.rules[r], { s: S, p: P, m: syl.names.M }), color: C.red });
  }
  if (!concl || !follows([major, minor], concl, all)) {
    const ok = (["A", "E", "I", "O"] as Form[]).filter((f) => follows([major, minor], { form: f, x: BIT.S, y: BIT.P }, all));
    // "Some" conclusions that only restate a stronger "all" / "no" one are left out.
    const strongest = ok.filter((f) => !(f === "I" && ok.includes("A")) && !(f === "O" && ok.includes("E")));
    caps.push(
      strongest.length
        ? { text: fill(w.follows, { list: strongest.map(sayAll).join("; ") }), color: C.blue }
        : { text: fill(w.followsNone, { s: S, p: P }), color: C.grey },
    );
  }
  if (syl.swapped) caps.push({ text: fill(w.swapped, { p: P }), color: C.grey });
  caps.push({ text: w.legend, color: "#495057" });

  const title = concl
    ? fill(w.title, { code: syl.code, name: NAMES[syl.code] ? ` · ${NAMES[syl.code]}` : "" })
    : fill(w.titleOpen, { mood: syl.mood, figure: syl.figure });
  return composeText(title, parts.join(""), cy + 172, caps);
}

// ---------- presets ----------

const sy = (f: string, g = "", exist = false): LogicSpec => ({ topic: "syllogism", f, g, vals: "", tf: true, exist });

export const SYL_PRESETS: { label: string; spec: LogicSpec }[] = [
  { label: "Barbara", spec: sy("All humans are mortal\nAll Greeks are humans", "All Greeks are mortal") },
  { label: "Celarent", spec: sy("No reptiles are mammals\nAll snakes are reptiles", "No snakes are mammals") },
  { label: "Darii", spec: sy("All squares are rectangles\nSome shapes are squares", "Some shapes are rectangles") },
  { label: "Ferio", spec: sy("No cats are dogs\nSome pets are cats", "Some pets are not dogs") },
  { label: "Undistributed middle", spec: sy("All cats are mammals\nAll dogs are mammals", "All cats are dogs") },
  { label: "Illicit major", spec: sy("All dogs are mammals\nNo cats are dogs", "No cats are mammals") },
  { label: "Darapti: is there a unicorn?", spec: sy("All unicorns are horses\nAll unicorns are white things", "Some white things are horses") },
  { label: "What follows?", spec: sy("No fish are mammals\nAll whales are mammals") },
  { label: "EIO-4", spec: sy("EIO-4") },
  { label: "Все … есть …", spec: sy("Все металлы есть проводники\nНекоторые сплавы есть металлы", "Некоторые сплавы есть проводники") },
  { label: "ყველა … არის …", spec: sy("ყველა ადამიანი არის მოკვდავი\nყველა ბერძენი არის ადამიანი", "ყველა ბერძენი არის მოკვდავი") },
];
