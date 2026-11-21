// Maths symbols (#451): what each is called, how it is read aloud and what it means are in the symbol locales
// (src/locales/symbols); here is what needs no words. Each symbol has its glyph, its group, a tiny example, the LaTeX
// (`tex`, matched in a question's LaTeX) and characters (`chars`, matched in its words or LaTeX) that show it in a
// question, the symbols easily taken for it, and the topics it turns up in. The symbols page (#/symbols) shows them by
// group; practice lists the ones a question uses, each a tap from its card.
import type { TopicId } from "../model/topics.ts";

export type SymGroup = "arithmetic" | "algebra" | "numberSets" | "setsLogic" | "geometry" | "calculus" | "linear" | "probability" | "greek";
export const SYM_GROUPS: readonly SymGroup[] = ["arithmetic", "algebra", "numberSets", "setsLogic", "geometry", "calculus", "linear", "probability", "greek"];

export type Sym = {
  id: string;
  group: SymGroup;
  /** How it is written. */
  glyph: string;
  /** A tiny example, read aloud in the locales. */
  example: string;
  /** LaTeX that shows it in a question's LaTeX: a command (matched whole) or a pattern. */
  tex?: readonly (string | RegExp)[];
  /** Characters that are it, in a question's words or LaTeX (and that find it when pasted into the search). */
  chars?: readonly string[];
  /** Symbols easily taken for it. */
  confused?: readonly string[];
  topics: readonly TopicId[];
};

const s = (id: string, group: SymGroup, glyph: string, example: string, topics: TopicId[], more: Partial<Pick<Sym, "tex" | "chars" | "confused">> = {}): Sym => ({
  id, group, glyph, example, topics, ...more,
});

// id (its LaTeX name), lower case, capital, a tiny example, topics.
const CAPITALS = new Set(["gamma", "delta", "theta", "lambda", "xi", "pi", "sigma", "upsilon", "phi", "psi", "omega"]);
const VARIANTS: Partial<Record<string, string[]>> = { phi: ["ϕ"], epsilon: ["ϵ"], theta: ["ϑ"], rho: ["ϱ"], sigma: ["ς"] };
const GREEK: readonly [string, string, string, string, TopicId[]][] = [
  ["alpha", "α", "Α", "α = 30°", ["geometry", "trigonometry", "statistics"]],
  ["beta", "β", "Β", "α + β = 90°", ["geometry", "statistics"]],
  ["gamma", "γ", "Γ", "γ = 180° − α − β", ["geometry", "calculus"]],
  ["delta", "δ", "Δ", "|x − 2| < δ", ["analysis", "calculus"]],
  ["epsilon", "ε", "Ε", "|aₙ − 1| < ε", ["analysis", "statistics"]],
  ["zeta", "ζ", "Ζ", "ζ(2) = π²/6", ["analysis", "numberTheory"]],
  ["eta", "η", "Η", "η = 0.1", ["ai", "optimisation"]],
  ["theta", "θ", "Θ", "sin θ = ½", ["trigonometry", "statistics"]],
  ["iota", "ι", "Ι", "ι: A → B", ["abstract"]],
  ["kappa", "κ", "Κ", "κ = 1/r", ["topology", "statistics"]],
  ["lambda", "λ", "Λ", "Av = λv", ["vectors", "probability"]],
  ["mu", "μ", "Μ", "μ = 5", ["statistics", "probability"]],
  ["nu", "ν", "Ν", "ν = n − 1", ["statistics"]],
  ["xi", "ξ", "Ξ", "ξ ∈ (a, b)", ["probability"]],
  ["omicron", "ο", "Ο", "ο", ["algorithms"]],
  ["pi", "π", "Π", "Π (k = 1 to 3) k = 6", ["geometry", "trigonometry", "probability"]],
  ["rho", "ρ", "Ρ", "ρ = 0.8", ["statistics", "vectors"]],
  ["sigma", "σ", "Σ", "σ = 2", ["statistics", "probability", "algebra"]],
  ["tau", "τ", "Τ", "τ = 2π", ["trigonometry", "calculus"]],
  ["upsilon", "υ", "Υ", "υ", ["vectors"]],
  ["phi", "φ", "Φ", "φ = (1 + √5)/2", ["geometry", "numberTheory", "probability"]],
  ["chi", "χ", "Χ", "χ² = 3.8", ["statistics"]],
  ["psi", "ψ", "Ψ", "ψ(x, t)", ["calculus"]],
  ["omega", "ω", "Ω", "ω = 2πf", ["calculus", "probability"]],
];

export const SYMBOLS: readonly Sym[] = [
  // Arithmetic and comparison
  s("plus", "arithmetic", "+", "3 + 4 = 7", ["numbers"]),
  s("minus", "arithmetic", "−", "9 − 2 = 7", ["numbers"], { chars: ["−"] }),
  s("times", "arithmetic", "×", "3 × 4 = 12", ["numbers", "algebra"], { tex: ["\\times"], chars: ["×"], confused: ["variable", "cross"] }),
  s("cdot", "arithmetic", "·", "3 · 4 = 12", ["numbers", "algebra"], { tex: ["\\cdot"], chars: ["·", "⋅"], confused: ["dotProduct"] }),
  s("divide", "arithmetic", "÷", "12 ÷ 4 = 3", ["numbers"], { tex: ["\\div"], chars: ["÷"], confused: ["slash"] }),
  s("slash", "arithmetic", "/", "3/4", ["numbers", "fractions"], { confused: ["divide"] }),
  s("equals", "arithmetic", "=", "2 + 2 = 4", ["numbers", "algebra"]),
  s("neq", "arithmetic", "≠", "3 ≠ 4", ["numbers", "algebra"], { tex: ["\\neq", "\\ne"], chars: ["≠"] }),
  s("approx", "arithmetic", "≈", "π ≈ 3.14", ["numbers", "fractions"], { tex: ["\\approx"], chars: ["≈"], confused: ["congruent", "similar"] }),
  s("lt", "arithmetic", "<", "3 < 5", ["numbers", "algebra"], { confused: ["gt", "le"] }),
  s("gt", "arithmetic", ">", "5 > 3", ["numbers", "algebra"], { confused: ["lt", "ge"] }),
  s("le", "arithmetic", "≤", "x ≤ 5", ["algebra"], { tex: ["\\le", "\\leq", "\\leqslant"], chars: ["≤", "⩽"], confused: ["lt"] }),
  s("ge", "arithmetic", "≥", "x ≥ 0", ["algebra"], { tex: ["\\ge", "\\geq", "\\geqslant"], chars: ["≥", "⩾"], confused: ["gt"] }),
  s("percent", "arithmetic", "%", "50 % of 8 = 4", ["fractions", "finance"], { tex: ["\\%"], chars: ["%"], confused: ["permille"] }),
  s("permille", "arithmetic", "‰", "5 ‰ = 0.5 %", ["fractions", "finance"], { chars: ["‰"], confused: ["percent"] }),
  s("blank", "arithmetic", "□", "3 + □ = 7", ["numbers", "algebra"], { tex: ["\\square", "\\Box", "\\boxed{\\phantom"], chars: ["□", "☐"], confused: ["qed"] }),
  s("pm", "arithmetic", "±", "x = ±3", ["algebra", "statistics"], { tex: ["\\pm"], chars: ["±"] }),
  // Algebra
  s("variable", "algebra", "x", "x + 3 = 5", ["algebra"], { confused: ["times"] }),
  s("power", "algebra", "xⁿ", "2³ = 8", ["algebra", "numbers"], { tex: [/\^\{?[2-9n]/], chars: ["²", "³", "ⁿ"] }),
  s("sqrt", "algebra", "√", "√9 = 3", ["algebra", "numbers"], { tex: [/\\sqrt(?!\[)/], chars: ["√"], confused: ["cbrt"] }),
  s("cbrt", "algebra", "∛", "∛8 = 2", ["algebra"], { tex: [/\\sqrt\[3\]/], chars: ["∛"], confused: ["sqrt"] }),
  s("abs", "algebra", "|x|", "|−5| = 5", ["algebra", "numbers"], { tex: ["\\lvert", "\\left|", /\|-?\d/], confused: ["norm", "conditional"] }),
  s("function", "algebra", "f(x)", "f(x) = 2x + 1", ["functions"], { tex: [/\b[fgh]\(/], confused: ["times"] }),
  s("inverse", "algebra", "f⁻¹", "f⁻¹(5) = 2", ["functions"], { tex: [/[fgh]\^\{-1\}/], chars: ["⁻¹"], confused: ["power"] }),
  s("compose", "algebra", "∘", "(f ∘ g)(x) = f(g(x))", ["functions", "abstract"], { tex: [/(?<!\^\{?)\\circ/], chars: ["∘"], confused: ["degree"] }),
  s("propto", "algebra", "∝", "y ∝ x", ["algebra", "functions"], { tex: ["\\propto"], chars: ["∝"], confused: ["alpha", "infinity"] }),
  s("floor", "algebra", "⌊x⌋", "⌊3.7⌋ = 3", ["numberTheory", "algorithms"], { tex: ["\\lfloor"], chars: ["⌊"], confused: ["ceil"] }),
  s("ceil", "algebra", "⌈x⌉", "⌈3.2⌉ = 4", ["numberTheory", "algorithms"], { tex: ["\\lceil"], chars: ["⌈"], confused: ["floor"] }),
  s("factorial", "algebra", "n!", "4! = 24", ["discrete", "probability"], { tex: [/[\d}a-z]!/] }),
  // Number sets
  s("naturals", "numberSets", "ℕ", "3 ∈ ℕ", ["numbers", "logic"], { tex: ["\\mathbb{N}", "\\N"], chars: ["ℕ"] }),
  s("integers", "numberSets", "ℤ", "−2 ∈ ℤ", ["numbers", "numberTheory"], { tex: ["\\mathbb{Z}", "\\Z"], chars: ["ℤ"] }),
  s("rationals", "numberSets", "ℚ", "½ ∈ ℚ", ["fractions", "logic"], { tex: ["\\mathbb{Q}", "\\Q"], chars: ["ℚ"] }),
  s("reals", "numberSets", "ℝ", "√2 ∈ ℝ", ["analysis", "functions"], { tex: ["\\mathbb{R}", "\\R"], chars: ["ℝ"] }),
  s("complexes", "numberSets", "ℂ", "2 + 3i ∈ ℂ", ["vectors", "analysis"], { tex: ["\\mathbb{C}", "\\C"], chars: ["ℂ"] }),
  // Sets and logic
  s("in", "setsLogic", "∈", "3 ∈ {1, 2, 3}", ["logic"], { tex: ["\\in"], chars: ["∈"], confused: ["epsilon", "notin"] }),
  s("notin", "setsLogic", "∉", "4 ∉ {1, 2, 3}", ["logic"], { tex: ["\\notin"], chars: ["∉"], confused: ["in"] }),
  s("subset", "setsLogic", "⊂", "{1} ⊂ {1, 2}", ["logic"], { tex: ["\\subset"], chars: ["⊂"], confused: ["subseteq"] }),
  s("subseteq", "setsLogic", "⊆", "{1, 2} ⊆ {1, 2}", ["logic"], { tex: ["\\subseteq"], chars: ["⊆"], confused: ["subset"] }),
  s("union", "setsLogic", "∪", "{1} ∪ {2} = {1, 2}", ["logic", "probability"], { tex: ["\\cup"], chars: ["∪"], confused: ["intersect", "or"] }),
  s("intersect", "setsLogic", "∩", "{1, 2} ∩ {2, 3} = {2}", ["logic", "probability"], { tex: ["\\cap"], chars: ["∩"], confused: ["union", "and"] }),
  s("setminus", "setsLogic", "∖", "{1, 2, 3} ∖ {2} = {1, 3}", ["logic"], { tex: ["\\setminus"], chars: ["∖"], confused: ["slash"] }),
  s("empty", "setsLogic", "∅", "{1} ∩ {2} = ∅", ["logic", "probability"], { tex: ["\\emptyset", "\\varnothing"], chars: ["∅"], confused: ["phi"] }),
  s("braces", "setsLogic", "{ … }", "{2, 4, 6}", ["logic", "probability"], { tex: ["\\{"] }),
  s("forall", "setsLogic", "∀", "∀x ∈ ℝ: x² ≥ 0", ["logic"], { tex: ["\\forall"], chars: ["∀"], confused: ["exists"] }),
  s("exists", "setsLogic", "∃", "∃x ∈ ℕ: x > 5", ["logic"], { tex: ["\\exists"], chars: ["∃"], confused: ["forall"] }),
  s("not", "setsLogic", "¬", "¬(x > 5)", ["logic"], { tex: ["\\neg", "\\lnot"], chars: ["¬"] }),
  s("and", "setsLogic", "∧", "x > 0 ∧ x < 5", ["logic"], { tex: ["\\land", "\\wedge"], chars: ["∧"], confused: ["intersect", "or"] }),
  s("or", "setsLogic", "∨", "x < 0 ∨ x > 5", ["logic"], { tex: ["\\lor", "\\vee"], chars: ["∨"], confused: ["union", "and"] }),
  s("implies", "setsLogic", "⇒", "x = 2 ⇒ x² = 4", ["logic"], { tex: ["\\Rightarrow", "\\implies"], chars: ["⇒"], confused: ["iff", "to"] }),
  s("iff", "setsLogic", "⇔", "x + 1 = 3 ⇔ x = 2", ["logic"], { tex: ["\\Leftrightarrow", "\\iff"], chars: ["⇔"], confused: ["implies"] }),
  s("therefore", "setsLogic", "∴", "x = 2 ∴ 2x = 4", ["logic"], { tex: ["\\therefore"], chars: ["∴"] }),
  s("qed", "setsLogic", "∎", "… so the claim holds. ∎", ["logic"], { tex: ["\\blacksquare", "\\qed"], chars: ["∎"], confused: ["blank"] }),
  // Geometry
  s("angle", "geometry", "∠", "∠ABC = 90°", ["geometry"], { tex: ["\\angle"], chars: ["∠"], confused: ["lt"] }),
  s("triangle", "geometry", "△", "△ABC", ["geometry"], { tex: ["\\triangle"], chars: ["△"], confused: ["delta"] }),
  s("perp", "geometry", "⊥", "AB ⊥ CD", ["geometry", "vectors"], { tex: ["\\perp"], chars: ["⊥"] }),
  s("parallel", "geometry", "∥", "AB ∥ CD", ["geometry"], { tex: ["\\parallel"], chars: ["∥"], confused: ["norm", "abs"] }),
  s("congruent", "geometry", "≅", "△ABC ≅ △DEF", ["geometry"], { tex: ["\\cong"], chars: ["≅"], confused: ["approx", "similar"] }),
  s("similar", "geometry", "∼", "△ABC ∼ △DEF", ["geometry"], { tex: [/\\triangle\s*[A-Z]+\s*\\sim/], chars: ["∼"], confused: ["distributed", "congruent"] }),
  s("degree", "geometry", "°", "a right angle is 90°", ["geometry", "trigonometry"], { tex: [/\^\{?\\circ/], chars: ["°"], confused: ["compose"] }),
  s("piConst", "geometry", "π", "C = 2πr", ["geometry", "trigonometry"], { tex: ["\\pi"], chars: ["π"] }),
  s("arc", "geometry", "AB⌒", "arc AB⌒ of a circle", ["geometry"], { tex: ["\\overset{\\frown}", "\\wideparen", "\\overarc"], chars: ["⌒"] }),
  s("segment", "geometry", "AB̅", "AB̅ = 5 cm", ["geometry"], { tex: [/\\overline\{[A-Z]{2}\}/], confused: ["mean"] }),
  // Sequences and calculus
  s("sum", "calculus", "∑", "∑ k (k = 1 to 4) = 10", ["algebra", "calculus", "statistics"], { tex: ["\\sum"], chars: ["∑"], confused: ["sigma"] }),
  s("product", "calculus", "∏", "∏ k (k = 1 to 4) = 24", ["algebra", "probability"], { tex: ["\\prod"], chars: ["∏"], confused: ["pi"] }),
  s("infinity", "calculus", "∞", "1/x → 0 as x → ∞", ["calculus", "analysis"], { tex: ["\\infty"], chars: ["∞"], confused: ["propto"] }),
  s("limit", "calculus", "lim", "lim (x → 0) sin x / x = 1", ["calculus", "analysis"], { tex: ["\\lim"] }),
  s("to", "calculus", "→", "x → 2", ["calculus", "analysis", "functions"], { tex: ["\\to", "\\rightarrow"], chars: ["→"], confused: ["implies"] }),
  s("change", "calculus", "Δ", "Δx = x₂ − x₁", ["calculus", "functions"], { tex: ["\\Delta"], chars: ["Δ"], confused: ["triangle", "delta"] }),
  s("ddx", "calculus", "d/dx", "d/dx x² = 2x", ["calculus"], { tex: [/\\frac\{d[a-z]?\}\{d[a-z]\}/, /\\frac\{d\}/] }),
  s("prime", "calculus", "f′", "f(x) = x² ⇒ f′(x) = 2x", ["calculus"], { tex: [/[a-z]'/, "\\prime"], chars: ["′"] }),
  s("partial", "calculus", "∂", "∂/∂x (x²y) = 2xy", ["calculus"], { tex: ["\\partial"], chars: ["∂"], confused: ["delta"] }),
  s("integral", "calculus", "∫", "∫₀¹ x dx = ½", ["calculus"], { tex: [/\\int(?![a-z])/], chars: ["∫"] }),
  s("contour", "calculus", "∮", "∮ F · dr", ["calculus", "analysis"], { tex: ["\\oint"], chars: ["∮"] }),
  s("nabla", "calculus", "∇", "∇f = (∂f/∂x, ∂f/∂y)", ["calculus", "ai"], { tex: ["\\nabla"], chars: ["∇"], confused: ["triangle"] }),
  // Linear algebra
  s("vector", "linear", "v⃗", "v⃗ = (3, 4)", ["vectors"], { tex: ["\\vec", "\\overrightarrow"], chars: ["⃗"], confused: ["boldVector"] }),
  s("boldVector", "linear", "𝐯", "𝐯 = (3, 4)", ["vectors"], { tex: ["\\mathbf", "\\boldsymbol"], confused: ["vector"] }),
  s("norm", "linear", "‖v‖", "‖(3, 4)‖ = 5", ["vectors", "ai"], { tex: ["\\|", "\\lVert", "\\Vert"], chars: ["‖"], confused: ["abs", "parallel"] }),
  s("dotProduct", "linear", "u · v", "(1, 2) · (3, 4) = 11", ["vectors"], { confused: ["cdot"] }),
  s("cross", "linear", "u × v", "i × j = k", ["vectors"], { confused: ["times"] }),
  s("transpose", "linear", "Aᵀ", "(1 2)ᵀ is a column", ["vectors", "ai"], { tex: [/\^\{?(T|\\top|\\intercal)\}?/], chars: ["ᵀ"] }),
  s("matrixInverse", "linear", "A⁻¹", "A · A⁻¹ = I", ["vectors"], { tex: [/[A-Z]\^\{-1\}/], confused: ["inverse"] }),
  s("det", "linear", "det", "det A = ad − bc", ["vectors"], { tex: ["\\det"] }),
  s("identity", "linear", "I", "A · I = A", ["vectors"], { tex: [/\b(I_n|I_\{?\d\}?)\b/] }),
  // Probability and statistics
  s("prob", "probability", "P(A)", "P(heads) = ½", ["probability"], { tex: [/\b(P|\\Pr|\\mathbb\{P\})\s*\((?![-\d])/] }),
  s("conditional", "probability", "P(A | B)", "P(6 | even) = ⅓", ["probability"], { tex: [/P\s*\([^)]*(\\mid|\|)/] , confused: ["abs"] }),
  s("expect", "probability", "E[X]", "E[die] = 3.5", ["probability", "statistics"], { tex: [/\b(E\s*\[|\\mathbb\{E\}|\\operatorname\{E\})/] }),
  s("variance", "probability", "Var(X)", "Var(X) = σ²", ["probability", "statistics"], { tex: [/Var|\\operatorname\{Var\}/] }),
  s("mean", "probability", "x̄", "x̄ = (2 + 4 + 6)/3 = 4", ["statistics"], { tex: [/\\bar\{?x/, /\\overline\{x\}/], chars: ["x̄"], confused: ["segment", "mu"] }),
  s("distributed", "probability", "X ~ N(0, 1)", "X ~ B(10, ½)", ["probability", "statistics"], { tex: [/[A-Z]\s*\\sim\s*\\?[A-Za-z]+/], chars: ["~"], confused: ["similar"] }),
  s("choose", "probability", "(n k)", "(5 2) = ₅C₂ = 10", ["probability", "discrete"], { tex: ["\\binom", "\\dbinom", /\{\}_\{?\d+\}?C/, /\bC\^/, /\bC_/] }),
  // Greek letters: lower case and capital; what they usually stand for is in the locales.
  ...GREEK.map(([id, lo, up, example, topics]) => {
    // Only the capitals unlike a Latin letter have a LaTeX command (\\Gamma; Α is just A) or are worth matching.
    const cap = CAPITALS.has(id) ? { tex: [`\\${id[0].toUpperCase()}${id.slice(1)}`], chars: [up] } : { tex: [], chars: [] };
    return s(id, "greek", `${lo} ${up}`, example, topics, {
      tex: [`\\${id}`, `\\var${id}`, ...cap.tex],
      chars: [lo, ...(VARIANTS[id] ?? []), ...cap.chars],
    });
  }),
];

export const symbolOf = (id: string) => SYMBOLS.find((x) => x.id === id);
export const isSymGroup = (v: unknown): v is SymGroup => SYM_GROUPS.includes(v as SymGroup);

/** The symbols a search finds: by the sign or a character that is it, or by words in the learner's language. */
export function searchSymbols(q: string, words: (s: Sym) => readonly string[]): Sym[] {
  const raw = q.trim();
  if (!raw) return [...SYMBOLS];
  const low = raw.toLowerCase();
  // A pasted sign: the symbols that are it. Letters and digits are searched as words.
  const sign = SYMBOLS.filter((s) => s.glyph.split(" ").includes(raw) || (s.chars ?? []).includes(raw) || s.glyph === raw);
  if (sign.length && !/^[\p{L}\d\s]+$/u.test(raw)) return sign;
  return SYMBOLS.filter((s) => s.id.toLowerCase().includes(low) || s.glyph.includes(raw) || words(s).some((w) => w.toLowerCase().includes(low)));
}

const texHit = (tex: string, p: string | RegExp) =>
  typeof p === "string" ? new RegExp(`${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-zA-Z])`).test(tex) : p.test(tex);

/**
 * The symbols worth a card in a question: matched in its LaTeX by `tex`, in its words or LaTeX by `chars`. The everyday
 * ones (+, −, =, the letter x) are left out, and the Greek π only when the geometry π is not there.
 */
export function symbolsIn(words: string, tex: string): Sym[] {
  const found = SYMBOLS.filter((x) => !EVERYDAY.has(x.id) && ((x.tex ?? []).some((p) => texHit(tex, p)) || (x.chars ?? []).some((c) => words.includes(c) || tex.includes(c))));
  const ids = new Set(found.map((x) => x.id));
  return found.filter((x) => !(x.id === "pi" && ids.has("piConst")) && !(x.id === "delta" && ids.has("change")) && !(x.id === "sigma" && ids.has("sum")));
}
const EVERYDAY = new Set(["plus", "minus", "equals", "variable", "slash", "lt", "gt", "function", "identity"]);
