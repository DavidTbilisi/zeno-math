// The 2025 NAEC logical reasoning paper (variant I), solved with the Logic tool.
// Each item checks the conclusion the picture states; the answer key is in the comments.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { renderLogic } from "../src/math/logic.ts";

const L = (s: string) => s.split("\n").map((x) => x.trim()).join("\n");
const board = (b: any) => ({ topic: "board", f: "", g: "", vals: "", tf: true, board: { mode: "bins", rules: "", ask: "", options: "", ...b } });
const grouping = { places: "ჭველფი(3), კალა(3), ლატფარი(1)", pool: "A B C D E F G", rules: "A@ჭველფი\nC=G\nA≠B\nF@კალა → E@ჭველფი" };
const schedule = {
  mode: "slots",
  places: "სამ-დილა სამ-საღამო ოთხ-დილა ოთხ-საღამო ხუთ-დილა ხუთ-საღამო პარ-დილა პარ-საღამო",
  pool: "აბასთუმანი ბორჯომი გრიგოლეთი თბილისი ნუნისი საირმე წყალტუბო ექსკურსია",
  rules: L(`[აბასთუმანი·ბორჯომი]
    ნუნისი@ოთხ-დილა
    გრიგოლეთი ∉ დილა
    თბილისი ∉ დილა
    ბორჯომი < წყალტუბო
    ნუნისი < საირმე → გრიგოლეთი < ნუნისი`),
};
const items: [string, any][] = [
  ["q01", { topic: "equiv", f: "m -> ~o", g: "~o -> ~m", vals: "", tf: true }],
  ["q02", { topic: "argument", f: "~d -> b; s <-> (b & ~d)", g: "~s -> d", vals: "", tf: true }],
  ["q03", { topic: "argument", f: "i -> e; i -> ~(p & e)", g: "p -> ~i", vals: "", tf: true }],
  ["q06-I", { topic: "argument", f: "v -> y; ~v", g: "~y", vals: "", tf: true }],
  ["q06-II", { topic: "argument", f: "y -> v; ~v", g: "~y", vals: "", tf: true }],
  ["q06-III", { topic: "argument", f: "y; y -> v", g: "v", vals: "", tf: true }],
  ["q07", { topic: "argument", f: "s -> (a -> z); b -> ~z", g: "s -> (a -> ~b)", vals: "", tf: true }],
  [
    "q08",
    board({
      mode: "slots",
      places: "7",
      pool: "აპოლონი ვენერა იუპიტერი კუპიდონი მერკური ნეპტუნი სატურნი",
      rules: L(`იუპიტერი@1 ∨ იუპიტერი@7
        ნეპტუნი@5
        [სატურნი·ვენერა]
        ([კუპიდონი·აპოლონი] ∧ [აპოლონი·მერკური]) ∨ ([მერკური·აპოლონი] ∧ [აპოლონი·კუპიდონი])`),
      options: L(`(ა) სატურნი@3
        (ბ) მერკური@3
        (გ) კუპიდონი@3
        (დ) ვენერა@3
        (ე) აპოლონი@3`),
    }),
  ],
  ["q10", { topic: "table", f: "(l -> r) & (k -> (h & l & t)) & k & (t -> ~r)", g: "", vals: "", tf: true }],
  // Bibi (B = Bibi tells the truth); g: Bibi is guilty; c: the criminal is a truth-teller. If Bibi did it, c says what Bibi is.
  ["q11-I", { topic: "knights", f: "Bibi: c\ng -> (c <-> Bibi)", g: "", vals: "", tf: true }],
  ["q11-II", { topic: "knights", f: "Bibi: ~c\ng -> (c <-> Bibi)", g: "", vals: "", tf: true }],
  ["q11-III", { topic: "knights", f: "Bibi: c | ~c\ng -> (c <-> Bibi)", g: "", vals: "", tf: true }],
  [
    "q12",
    board({
      ...grouping,
      options: L(`(ა) ლატფარი: E | ჭველფი: A C G | კალა: B D F
        (ბ) ლატფარი: E | ჭველფი: B D F | კალა: A C G
        (გ) ლატფარი: F | ჭველფი: A B C | კალა: D G E
        (დ) ლატფარი: F | ჭველფი: A D E | კალა: B C G
        (ე) ლატფარი: F | ჭველფი: A C D | კალა: B E G`),
    }),
  ],
  ["q13", board({ ...grouping, ask: "A=F", options: "(ა) C@ჭველფი\n(ბ) E@ლატფარი\n(გ) D@კალა\n(დ) B@კალა\n(ე) E@ჭველფი" })],
  [
    "q14",
    board({
      ...grouping,
      options: L(`(ა) A@ჭველფი ∧ E@ჭველფი
        (ბ) D@კალა ∧ E@კალა
        (გ) D@ჭველფი ∧ F@ჭველფი
        (დ) D@ჭველფი ∧ E@ჭველფი
        (ე) B@კალა ∧ G@კალა`),
    }),
  ],
  [
    "q15",
    board({
      ...schedule,
      options: L(`(ა) ექსკურსია თბილისი ნუნისი გრიგოლეთი აბასთუმანი ბორჯომი საირმე წყალტუბო
        (ბ) ექსკურსია გრიგოლეთი ნუნისი წყალტუბო საირმე თბილისი აბასთუმანი ბორჯომი
        (გ) გრიგოლეთი ექსკურსია ნუნისი საირმე აბასთუმანი ბორჯომი წყალტუბო თბილისი
        (დ) გრიგოლეთი საირმე ნუნისი აბასთუმანი ექსკურსია ბორჯომი წყალტუბო თბილისი
        (ე) საირმე ექსკურსია ნუნისი აბასთუმანი ბორჯომი თბილისი წყალტუბო გრიგოლეთი`),
    }),
  ],
  [
    "q16",
    board({
      ...schedule,
      ask: "ექსკურსია@ხუთ-დილა",
      options: L(`(ა) ბორჯომი@ხუთ-საღამო
        (ბ) გრიგოლეთი@სამ-საღამო
        (გ) თბილისი@ოთხ-საღამო
        (დ) საირმე@სამ-დილა
        (ე) წყალტუბო@პარ-დილა`),
    }),
  ],
  [
    "q17",
    board({
      ...schedule,
      ask: "საირმე@პარ-საღამო",
      options: L(`(ა) ექსკურსია@სამ-დილა
        (ბ) ექსკურსია@სამ-საღამო
        (გ) ექსკურსია@ხუთ-დილა
        (დ) ექსკურსია@ხუთ-საღამო
        (ე) ექსკურსია@პარ-დილა`),
    }),
  ],
];
// What the English picture must say, per item (answer in brackets).
const EXPECT: Record<string, string[]> = {
  q01: ["Not equivalent"],
  q02: ["Valid"],
  q03: ["Valid"],
  "q06-I": ["Invalid"],
  "q06-II": ["Valid"],
  "q06-III": ["Valid"],
  q07: ["Valid"],
  q08: ["Must be true: (ე).", "Must be false: (ა), (ბ), (გ), (დ)."], // (ე)
  q10: ["A contradiction: false in all 32 rows."], // (ე)
  "q11-II": ["g: false"],
  "q11-III": ["Bibi: truth-teller"],
  q12: ["Survives the sweep: (დ)."], // (დ)
  q13: ["Must be false: (ა)."], // (ა)
  q14: ["Fixes the whole board: (ბ)."], // (ბ)
  q15: ["Survives the sweep: (ე)."], // (ე)
  q16: ["Must be true: (დ)."], // (დ)
  q17: ["Must be true: (ა)."], // (ა)
};

const text = (svg: string) => [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, "")).join("\n");

for (const [name, spec] of items) {
  test(`NAEC ${name}`, () => {
    const shown = text(renderLogic(spec, en.logicWords).svg);
    for (const want of EXPECT[name] ?? []) assert.ok(shown.includes(want), `${name}: expected "${want}" in\n${shown}`);
    // The Georgian picture (the one the exam is in) renders too.
    assert.doesNotMatch(renderLogic(spec, ka.logicWords).svg, /NaN|undefined/);
  });
}
