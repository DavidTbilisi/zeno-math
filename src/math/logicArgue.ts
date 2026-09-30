// Strengthen / weaken questions. The argument is written with letters (and a legend saying what each letter
// means), background links between the letters, premises and a conclusion. The tool finds the unstated premise
// (the simplest extra premise that makes the argument valid) and judges every answer option: does it close the
// gap, is it needed, does it defeat the conclusion, deny a premise, or only shift the odds — measured as the
// share of the cases (truth-table rows) where the conclusion holds, before and after the option is added.
import { txt } from "./algoArrays";
import { C, fill, r2, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";
import { evalNode, parseFormula, toText, varsOf, type LogicSpec, type LogicWords, type Node } from "./logic";
import { composeText, tw } from "./logicPuzzles";

export type SwAsk = "strengthen" | "weaken";
export const SW_ASKS: SwAsk[] = ["strengthen", "weaken"];
export type SwPattern = "none" | "survey" | "causal" | "sample" | "analogy" | "plan" | "criterion";
export const SW_PATTERNS: SwPattern[] = ["none", "survey", "causal", "sample", "analogy", "plan", "criterion"];
/** legend: "s: sentence" per line; premises and links: formulas separated by ; ; options: "(ა) formula" per line. */
export type SwSpec = { ask: SwAsk; pattern: SwPattern; legend: string; premises: string; links: string; conclusion: string; options: string };

type Card = { name: string; gap: string; plus: string[]; minus: string[] };
export type SwWords = {
  titles: Record<SwAsk, string>;
  noPremises: string;
  noConclusion: string;
  badLegend: string;
  tooMany: string;
  premises: string;
  links: string;
  conclusion: string;
  gapTitle: string;
  noGap: string;
  noBridge: string;
  not: string;
  if: string;
  then: string;
  and: string;
  or: string;
  options: string;
  verdicts: { sufficient: string; necessary: string; strengthens: string; defeater: string; weakens: string; irrelevant: string; conflicts: string };
  baseline: string;
  most: Record<SwAsk, string>;
  none: Record<SwAsk, string>;
  info: string;
  plus: string;
  minus: string;
  gap: string;
  patterns: Record<Exclude<SwPattern, "none">, Card> & { none: { name: string } };
};

// ---------- logic ----------

type Model = { vars: string[]; rows: Record<string, boolean>[] };

/** Every assignment of the letters that satisfies all the given formulas. */
function models(vars: string[], fs: Node[]): Record<string, boolean>[] {
  const out: Record<string, boolean>[] = [];
  for (let m = 0; m < 2 ** vars.length; m++) {
    const e = Object.fromEntries(vars.map((v, k) => [v, ((m >> k) & 1) === 1]));
    if (fs.every((f) => evalNode(f, e))) out.push(e);
  }
  return out;
}
const entails = (rows: Record<string, boolean>[], f: Node) => rows.every((e) => evalNode(f, e));
const share = (rows: Record<string, boolean>[], f: Node) => (rows.length ? rows.filter((e) => evalNode(f, e)).length / rows.length : NaN);

type Verdict = keyof SwWords["verdicts"];
type Judged = { label: string; node: Node; verdict: Verdict; necessary: boolean; before: number; after: number };

function judge(base: Model, concl: Node, x: Node): Omit<Judged, "label" | "node"> {
  const before = share(base.rows, concl);
  const withX = base.rows.filter((e) => evalNode(x, e));
  // Premises are accepted: an option that cannot be true with them denies one of them.
  if (!withX.length) return { verdict: "conflicts", necessary: false, before, after: NaN };
  const after = share(withX, concl);
  // Needed: whenever the premises and the conclusion hold, so does the option.
  const necessary = entails(base.rows.filter((e) => evalNode(concl, e)), x) && !entails(base.rows, x);
  const verdict: Verdict =
    after === 1 && before < 1 ? "sufficient" : after === 0 && before > 0 ? "defeater" : after > before + 1e-9 ? "strengthens" : after < before - 1e-9 ? "weakens" : "irrelevant";
  return { verdict, necessary, before, after };
}

const lit = (v: string, neg: boolean): Node => (neg ? { t: "not", a: { t: "var", name: v } } : { t: "var", name: v });

/** The simplest extra premises that make the argument valid: a letter, or "if … then …" between two letters. */
function bridges(base: Model, linksOnly: Model, concl: Node, premiseVars: Set<string>, conclVars: Set<string>): Node[] {
  if (entails(base.rows, concl)) return [];
  const found: { n: Node; score: number; size: number; key: string }[] = [];

  const consider = (n: Node, size: number) => {
    const rows = base.rows.filter((e) => evalNode(n, e));
    if (!rows.length || !entails(rows, concl) || entails(base.rows, n)) return;
    // A bridge must use the premises: something that gives the conclusion on its own (the conclusion itself,
    // or a letter the background already leads to it from) skips the argument instead of completing it.
    if (entails(linksOnly.rows.filter((e) => evalNode(n, e)), concl)) return;
    // The same truth table (a contrapositive, say) is the same bridge.
    const key = base.rows.map((e) => (evalNode(n, e) ? 1 : 0)).join("");
    const vs = varsOf([n]);
    const score = (vs.some((v) => premiseVars.has(v)) ? 2 : 0) + (vs.some((v) => conclVars.has(v)) ? 1 : 0);
    // Keep the form that says the most about the argument (v → m rather than just m).
    const old = found.findIndex((f) => f.key === key);
    if (old >= 0) {
      if (score > found[old].score) found[old] = { n, score, size, key };
      return;
    }
    found.push({ n, score, size, key });
  };
  for (const v of base.vars) for (const neg of [false, true]) consider(lit(v, neg), 1);
  // Premise letters first as the "if" part, so s → a is kept rather than its contrapositive ¬a → ¬s.
  const order = [...base.vars].sort((x, y) => Number(premiseVars.has(y)) - Number(premiseVars.has(x)));
  for (const a of order)
    for (const b of base.vars)
      if (a !== b) for (const na of [false, true]) for (const nb of [false, true]) consider({ t: "bin", op: "imp", a: lit(a, na), b: lit(b, nb) }, 2);
  // Most telling first: linking a premise to the conclusion, then the shortest.
  found.sort((x, y) => y.score - x.score || x.size - y.size);
  return found.slice(0, 3).map((f) => f.n);
}

// ---------- reading ----------

function readLegend(src: string, w: SwWords): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of src.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const r = /^(\p{L}\d*)\s*[:=—–-]\s*(.+)$/u.exec(line);
    if (!r) throw new Error(fill(w.badLegend, { s: line }));
    m.set(r[1], r[2].trim());
  }
  return m;
}

const split = (s: string) => s.split(/[;\n]+/).map((x) => x.trim()).filter(Boolean);

/** A formula said in words from the legend: "if <p> then not: <q>". */
function sayIt(n: Node, legend: Map<string, string>, w: SwWords): string {
  const say = (m: Node): string => {
    if (m.t === "var") return legend.get(m.name) ?? m.name;
    if (m.t === "not") return `${w.not}: ${say(m.a)}`;
    if (m.t === "bin" && m.op === "imp") return `${w.if} ${say(m.a)}, ${w.then} ${say(m.b)}`;
    if (m.t === "bin" && m.op === "and") return `${say(m.a)} ${w.and} ${say(m.b)}`;
    if (m.t === "bin" && m.op === "or") return `${say(m.a)} ${w.or} ${say(m.b)}`;
    return toText(m);
  };
  return say(n);
}

// ---------- drawing ----------

/** Greedy word wrap to a pixel width (with the rough text widths used elsewhere). */
function wrapPx(text: string, maxPx: number, size: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && tw(next, size) > maxPx) (out.push(cur), (cur = word));
    else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

type BoxStyle = { stroke: string; fill: string; dash?: boolean; title?: string; titleColor?: string };

/** A box with an optional title, a formula line and the sentence wrapped under it. */
function box(x: number, y: number, width: number, formula: string, sentence: string, st: BoxStyle): { svg: string; h: number } {
  const lines = sentence ? wrapPx(sentence, width - 20, 12.5) : [];
  const parts: string[] = [];
  let yy = y + 20;
  if (st.title) {
    parts.push(txt(x + 10, yy, st.title, { size: 12, bold: true, color: st.titleColor ?? "#495057" }));
    yy += 19;
  }
  if (formula) {
    parts.push(txt(x + 10, yy, formula, { size: 14, bold: true, color: C.ink }));
    yy += 18;
  }
  for (const l of lines) {
    parts.push(txt(x + 10, yy, l, { size: 12.5, color: "#343a40" }));
    yy += 16;
  }
  const h = yy - y - 4;
  const rect = `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(width)}" height="${r2(h)}" rx="8" fill="${st.fill}" stroke="${st.stroke}" stroke-width="1.6"${st.dash ? ` stroke-dasharray="6 4"` : ""}/>`;
  return { svg: rect + parts.join(""), h };
}

const arrow = (x: number, y1: number, y2: number, color = "#868e96") =>
  `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2 - 6}" stroke="${color}" stroke-width="2"/><path d="M${x - 5} ${y2 - 8} L${x} ${y2} L${x + 5} ${y2 - 8} Z" fill="${color}"/>`;

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function renderStrengthen(spec: SwSpec, words: LogicWords): RenderedSvg {
  const w = words.sw;
  const legend = readLegend(spec.legend, w);
  const premises = split(spec.premises).map((s) => parseFormula(s, words));
  const links = split(spec.links).map((s) => parseFormula(s, words));
  if (!premises.length) throw new Error(w.noPremises);
  if (!spec.conclusion.trim()) throw new Error(w.noConclusion);
  const concl = parseFormula(spec.conclusion, words);
  const options = spec.options
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = /^(\([^)]{1,4}\)|[\p{L}\p{N}]{1,2}[.)])\s+(.+)$/u.exec(line);
      return { label: m ? m[1] : `(${i + 1})`, node: parseFormula(m ? m[2] : line, words) };
    });
  const vars = varsOf([...premises, ...links, concl, ...options.map((o) => o.node)]);
  if (vars.length > 12) throw new Error(fill(w.tooMany, { n: 12 }));
  const base: Model = { vars, rows: models(vars, [...premises, ...links]) };
  const premiseVars = new Set(varsOf(premises));
  const conclVars = new Set(varsOf([concl]));

  const parts: string[] = [];
  let y = 0;
  // Premises in a row of boxes.
  const n = premises.length;
  const gapX = 14;
  const bw = Math.min(300, (W - 48 - (n - 1) * gapX) / n);
  const px0 = (W - (n * bw + (n - 1) * gapX)) / 2;
  const pboxes = premises.map((p, i) =>
    box(px0 + i * (bw + gapX), y + 18, bw, toText(p), sayIt(p, legend, w), { stroke: "#868e96", fill: "#f8f9fa" }),
  );
  parts.push(txt(px0, y + 12, w.premises, { size: 12, bold: true, color: "#495057" }));
  pboxes.forEach((b) => parts.push(b.svg));
  y += 18 + Math.max(...pboxes.map((b) => b.h));
  if (links.length) {
    const linkText = `${w.links}: ${links.map((l) => toText(l)).join(";  ")}`;
    for (const l of wrapPx(linkText, W - 48, 12)) {
      y += 17;
      parts.push(txt(W / 2, y, l, { size: 12, anchor: "middle", color: "#868e96" }));
    }
  }
  parts.push(arrow(W / 2, y + 4, y + 30));
  y += 34;

  // The gap.
  const br = bridges(base, { vars, rows: models(vars, links) }, concl, premiseVars, conclVars);
  const gw = W - 96;
  const gapLines = br.length ? br.map((b) => `${toText(b)} — ${sayIt(b, legend, w)}`) : [entails(base.rows, concl) ? w.noGap : w.noBridge];
  // One line (or more, wrapped) per bridge.
  const gparts: string[] = [];
  let gy = y + 20;
  gparts.push(txt(58, gy, w.gapTitle, { size: 12, bold: true, color: C.purple }));
  gy += 20;
  for (const l of gapLines) {
    for (const [k, seg] of wrapPx(l, gw - 20, 13).entries()) {
      gparts.push(txt(58, gy, seg, { size: 13, bold: k === 0 && br.length > 0, color: br.length ? C.purple : "#495057" }));
      gy += 17;
    }
    gy += 2;
  }
  const gh = gy - y - 2;
  parts.push(`<rect x="48" y="${r2(y)}" width="${gw}" height="${r2(gh)}" rx="8" fill="#f8f0fc" stroke="${C.purple}" stroke-width="1.6" stroke-dasharray="6 4"/>`, ...gparts);
  y += gh;
  parts.push(arrow(W / 2, y + 4, y + 30));
  y += 34;

  // The conclusion.
  const cb = box(48, y, W - 96, toText(concl), sayIt(concl, legend, w), { stroke: C.blue, fill: "#e7f5ff", title: w.conclusion, titleColor: C.blue });
  parts.push(cb.svg);
  y += cb.h + 20;

  // The pattern card.
  if (spec.pattern !== "none") {
    const card = w.patterns[spec.pattern];
    const cx = 24;
    const cw = W - 48;
    const lines: { t: string; color: string; bold?: boolean }[] = [
      { t: card.name, color: C.ink, bold: true },
      ...wrapPx(`${w.gap}: ${card.gap}`, cw - 20, 12.5).map((t) => ({ t, color: C.purple })),
      ...card.plus.flatMap((p) => wrapPx(`+ ${p}`, cw - 20, 12.5).map((t) => ({ t, color: C.green }))),
      ...card.minus.flatMap((p) => wrapPx(`− ${p}`, cw - 20, 12.5).map((t) => ({ t, color: C.red }))),
    ];
    const ch = 14 + lines.length * 17;
    parts.push(`<rect x="${cx}" y="${r2(y)}" width="${cw}" height="${ch}" rx="8" fill="#fff9db" stroke="#fab005" stroke-width="1.4"/>`);
    lines.forEach((l, i) => parts.push(txt(cx + 10, y + 20 + i * 17, l.t, { size: l.bold ? 13.5 : 12.5, bold: l.bold, color: l.color })));
    y += ch + 20;
  }

  // The options.
  const judged: Judged[] = options.map((o) => ({ label: o.label, node: o.node, ...judge(base, concl, o.node) }));
  if (judged.length) {
    parts.push(txt(24, y + 12, w.options, { size: 13, bold: true, color: "#495057" }));
    y += 22;
    const verdictText = (j: Judged) => w.verdicts[j.verdict] + (j.necessary && j.verdict !== "sufficient" ? ` · ${w.verdicts.necessary}` : "");
    const labelW = 36;
    const formW = Math.min(120, Math.max(40, ...judged.map((j) => tw(toText(j.node), 13) + 14)));
    const barW = 108;
    const verdictW = Math.min(200, Math.max(...judged.map((j) => tw(verdictText(j), 12) + 10)));
    const textW = W - 48 - labelW - formW - barW - verdictW - 16;
    judged.forEach((j, i) => {
      // The sentence wraps, so each row is as tall as it needs.
      const lines = wrapPx(sayIt(j.node, legend, w), textW, 12);
      const rowH = Math.max(28, 10 + lines.length * 15);
      const mid = y + rowH / 2;
      const color = { sufficient: C.green, strengthens: C.green, defeater: C.red, weakens: C.red, irrelevant: "#868e96", conflicts: C.orange, necessary: C.blue }[j.verdict];
      if (i % 2 === 0) parts.push(`<rect x="24" y="${r2(y)}" width="${W - 48}" height="${r2(rowH)}" fill="#f8f9fa"/>`);
      let x = 30;
      parts.push(txt(x, mid + 5, j.label, { size: 13, bold: true }));
      x += labelW;
      parts.push(txt(x, mid + 5, toText(j.node), { size: 13, bold: true }));
      x += formW;
      lines.forEach((l, k) => parts.push(txt(x, mid + 4 - ((lines.length - 1) * 15) / 2 + k * 15, l, { size: 12, color: "#495057" })));
      x += textW + 8;
      // The chance that the conclusion holds: black tick before, coloured bar after.
      const bw = barW - 40;
      parts.push(`<rect x="${r2(x)}" y="${r2(mid - 5)}" width="${bw}" height="10" rx="3" fill="#e9ecef"/>`);
      if (!Number.isNaN(j.after)) {
        const bc = j.after > j.before + 1e-9 ? C.green : j.after < j.before - 1e-9 ? C.red : "#adb5bd";
        parts.push(`<rect x="${r2(x)}" y="${r2(mid - 5)}" width="${r2(bw * j.after)}" height="10" rx="3" fill="${bc}"/>`);
        parts.push(txt(x + bw + 5, mid + 4, pct(j.after), { size: 11, color: "#495057" }));
      }
      parts.push(`<line x1="${r2(x + bw * j.before)}" y1="${r2(mid - 9)}" x2="${r2(x + bw * j.before)}" y2="${r2(mid + 9)}" stroke="${C.ink}" stroke-width="1.6"/>`);
      x += barW;
      parts.push(txt(x, mid + 4, verdictText(j), { size: 12, bold: j.verdict !== "irrelevant", color }));
      y += rowH;
    });
    y += 8;
  }

  // Which option answers the question.
  const caps: Caption[] = [];
  const before = share(base.rows, concl);
  caps.push({ text: fill(w.baseline, { p: pct(before) }), color: "#495057" });
  if (judged.length) {
    const usable = judged.filter((j) => !Number.isNaN(j.after));
    const dir = spec.ask === "strengthen" ? 1 : -1;
    const best = Math.max(...usable.map((j) => dir * (j.after - j.before)));
    const winners = best > 1e-9 ? usable.filter((j) => Math.abs(dir * (j.after - j.before) - best) < 1e-9).map((j) => j.label) : [];
    caps.push(winners.length ? { text: fill(w.most[spec.ask], { list: winners.join(", ") }), color: spec.ask === "strengthen" ? C.green : C.red } : { text: w.none[spec.ask], color: "#495057" });
  }
  caps.push({ text: w.info, color: "#495057" });
  return composeText(w.titles[spec.ask], parts.join(""), y, caps);
}

// ---------- presets ----------

const sw = (b: SwSpec): LogicSpec => ({ topic: "strengthen", f: "", g: "", vals: "", tf: true, sw: b });
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean).join("\n");

export const SW_PRESETS: { label: string; spec: LogicSpec }[] = [
  {
    label: "NAEC 2025 · 9: which most strengthens?",
    spec: sw({
      ask: "strengthen",
      pattern: "survey",
      legend: lines(`s: მგზავრები ტრანსპორტს უსაფრთხოებისა და დროულობის მიხედვით უფრო ირჩევენ, ვიდრე დაბალი ტარიფების გამო
        b: მგზავრთა ნაკადი რეალურად უფრო საიმედოობას მიჰყვება, ვიდრე ფასს
        c: ნაკადის გასაზრდელად საიმედოობა უფრო მნიშვნელოვანია, ვიდრე დაბალი ფასები
        a: გამოკითხვებით, მგზავრები დაბალ ტარიფს ყველაზე მნიშვნელოვან ფაქტორად მიიჩნევენ
        p: ფასის შემცირება მეტ მგზავრს ატარებს საჯარო ტრანსპორტში
        q: ფასის შემცირებამ არ გაზარდა ნაკადი იქ, სადაც ტრანსპორტი შეფერხებებით მუშაობდა
        d: მგზავრები პრიორიტეტად ზონების გაფართოებას ასახელებენ და არა დროის შემცირებას
        e: დაბალი ტარიფის გარეშე საიმედოობის გაუმჯობესება ნაკადს ვერ გაზრდის`),
      premises: "s",
      links: "b -> c; a -> ~s; p -> ~b; q -> b; e -> ~c",
      conclusion: "c",
      options: "(ა) a\n(ბ) p\n(გ) q\n(დ) d\n(ე) e",
    }),
  },
  {
    label: "NAEC 2025 · 5: why might it still fail?",
    spec: sw({
      ask: "weaken",
      pattern: "plan",
      legend: lines(`v: მოსწავლე უკეთ სწავლობს, თუ მასალა მისთვის უპირატესი სტილით მიეწოდება
        m: მოსწავლის მიერ სუბიექტურად შერჩეული სტილი მისთვის მართლაც ოპტიმალურია
        o: მოსწავლის შერჩეულ სტილზე მორგებული სწავლება ოპტიმალურ შედეგს იძლევა
        a: ჯერ უნდა დადგინდეს, რომელი სტილი შეესაბამება თითოეულ მოსწავლეს
        b: მოსწავლეები ოპტიმალური სტილის ჯგუფებად იყოფა
        g: მასალის სპეციფიკით განსაზღვრული ოპტიმალური სტილი და მოსწავლის შერჩეული სტილი ხშირად არ ემთხვევა
        d: პროგრამის სხვადასხვა ნაწილისთვის ოპტიმალურია სხვადასხვა სტილი
        e: სწავლის სტილის უნივერსალური კლასიფიკაცია არ არსებობს`),
      premises: "v",
      links: "(v & m) -> o; g -> ~m",
      conclusion: "o",
      options: "(ა) a\n(ბ) b\n(გ) g\n(დ) d\n(ე) e",
    }),
  },
  {
    label: "Bike lanes and accidents (causal)",
    spec: sw({
      ask: "strengthen",
      pattern: "causal",
      legend: lines(`k: cities with more bike lanes have fewer car accidents
        x: something else, such as lighter traffic, explains both
        l: bike lanes reduce car accidents
        t: accidents fell in the same city right after its bike lanes opened
        r: the cities with many bike lanes also have much less car traffic
        h: cyclists say they like the new lanes
        f: the accident figures were misread`),
      premises: "k",
      links: "(k & ~x) -> l; t -> ~x; r -> x; f -> ~k",
      conclusion: "l",
      options: "(ა) t\n(ბ) r\n(გ) h\n(დ) f",
    }),
  },
  {
    label: "Readers want print (sample)",
    spec: sw({
      ask: "weaken",
      pattern: "sample",
      legend: lines(`s: 80% of the surveyed readers want a print edition
        v: the survey reached a random sample of all readers
        a: most readers want a print edition
        r: the survey was sent only to current print subscribers
        q: many readers answered the survey
        n: the magazine's website has many readers`),
      premises: "s",
      links: "(s & v) -> a; r -> ~v",
      conclusion: "a",
      options: "(ა) v\n(ბ) r\n(გ) q\n(დ) n",
    }),
  },
];
