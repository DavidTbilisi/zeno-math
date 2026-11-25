// The mark on each place of a roadmap's rooms (#584): a few characters that name the item, kept the same in every
// language so a place can be learnt by its look. A skill that is the home of idea cards (#579) is marked with one of its
// ideas' glyphs (HOME_IDEA, or its first idea), a skill without one by SKILL_GLYPHS below, a game or a lab by its icon
// in the menus, and a topic's "What is…?" intro by the topic's own icon and a question mark. A skill missing from SKILL_GLYPHS falls back to
// its topic's icon, so a new skill on a roadmap is never blank; tests/roomLayout.test.ts asks for marks that differ
// within a room.
import type { SkillId } from "../math/practiceSkills.ts";
import { isLiveEntry, MENUS } from "../menus.ts";
import { IDEA_CARDS } from "./ideaCards.ts";
import type { IdeaNode } from "./conceptGraph.ts";
import { hasIdeas, SKILL_IDEAS, type IdeaSkill } from "./ideaState.ts";
import { isLab, isRead, isSkill, type Item } from "./roadmap.ts";
import { TOPICS } from "./topics.ts";

/** The idea whose glyph marks its home skill, where the first of the skill's ideas would say less. */
const HOME_IDEA: Partial<Record<IdeaSkill, IdeaNode>> = {
  times: "multiplyFacts", fractions: "addSub", integers: "negLine", indices: "powValue", expand: "distribute", order: "mulFirst", rounding: "roundPlace", hcf: "hcf",
};

/** A mark for each skill on a roadmap that has no idea card of its own: its notation where it has one. */
export const SKILL_GLYPHS: Partial<Record<SkillId, string>> = {
  // number
  quickLook: "•••", compare: "3<5", ordinals: "№1", skipCount: "2·4·6", columnSums: "¹38+47", longDivide: "23)69", decimalTimes: "0.3×0.4", fractionSums: "¼+¼", shapeKinds: "△□○", estimateLine: "⊢•⊣", closerTo: "≈?", time: "12:30", measure: "cm", money: "🪙",
  barModels: "▭▭?", makeTarget: "→24", kakooma: "+=?", parity: "±±", currency: "€⇄$",
  placeValue: "3|4|5", addSubtract: "8+5", tables: "6×7", divide: "56÷7", squares: "√49", convert: "½=50%", stackedFractions: "½⁄3", areaPerimeter: "▭cm²",
  // fractions, ratio and percentages
  shadeFraction: "◑", compareFractions: "⅓<½", equivalent: "⅔=⁴⁄₆", orderFractions: "<⅓<", makeWhole: "⅓+⅔", decimals: "0.25",
  percent: "25%", ratio: "3:2", rate: "km/h", inflation: "↑%",
  // number theory
  bases: "1011₂", divisibility: "÷3?", primes: "2·3·5", modular: "≡", congruences: "ax≡b", crt: "≡≡", fermatEuler: "aᵖ⁻¹", rsa: "RSA",
  discreteLog: "gˣ=h", bezout: "ax+by", residues: "x²≡a", elGamal: "gᵏ", ellipticCurves: "y²=x³",
  // algebra
  shapePatterns: "○△○△", findRule: "?→", growingPattern: "▪▪▪", balance: "▲=●●", sameExpression: "2x=x+x", linear: "2x=6", proportion: "y∝x",
  formulae: "s=d/t", logs: "log", sequences: "a₁,a₂", series: "Σ", inequalities: "x≤3", factor: "x²−1", algFractions: "¹⁄ₓ",
  quadratic: "x²+bx", simultaneous: "{x,y}", polynomials: "p(x)", surds: "√2",
  // functions
  graphStory: "⤴t", functions: "x↦y", coordinates: "(x,y)", slope: "↗m", line: "y=mx", distance: "|AB|",
  // geometry and trigonometry
  shapeArea: "cm²", symmetryLines: "◇|", estimateAngle: "∠?", missingAngle: "∠x", parallelAngles: "∥∠", pythagoras: "c²=a²+b²", triangleInequality: "a+b>c", cubeNets: "✚", circles: "⊙",
  powerPoint: "⊙·P", arcs: "rθ", similarity: "∼", volume: "V=", righttri: "a²+b²", practicalTrig: "∠θ", trigRules: "a/sinA",
  trigexact: "sin30°", identities: "≡θ", nonEuclidean: "∠<π", projective: "ℙ²", curves: "κ,τ", surfaces: "K",
  // vectors and matrices
  vectors: "→v", dotangle: "u·v", matrices: "AB", determinant: "det", linearMaps: "T(v)", projection: "proj", elimination: "rref", eigen: "λv",
  subspaces: "span", basis: "e₁e₂", rankNullity: "r+n", innerProducts: "⟨u,v⟩", spectral: "diag", svd: "UΣVᵀ", complex: "a+bi",
  polarForm: "reⁱᶿ", deMoivre: "zⁿ",
  // logic and discrete maths
  logic: "p∧q", quantifiers: "∀x", proofs: "∎", sets: "A∪B", mappings: "↣↠", relations: "≼", cardinality: "ℵ₀", normalForms: "CNF",
  structures: "⊨", ordinalArith: "ω+1", induction: "n+1", recurrences: "aₙ₊₁", counting: "nCr", inclusionExclusion: "|A∪B|",
  pigeonhole: "n+1→n", oneStroke: "✐", shortestPath: "A⇝B", spanningTree: "T⊂G", colouring: "χ(G)", graphTheory: "V,E", growth: "O(n)",
  inversions: "⤨", generating: "G(x)",
  // probability and statistics
  probability: "P(A)", conditional: "P(A|B)", expectation: "E[X]", distributions: "B(n,p)", randomWalks: "↝", densities: "∫f", jointDist: "f(x,y)",
  mgf: "M(t)", limitTheorems: "√n", bayes: "P(θ|x)", markov: "Pᵢⱼ", poissonProcess: "λt", brownian: "W(t)", readChart: "▁▃▅",
  diagrams: "◕", average: "x̄", correlation: "r", regression: "ŷ", hypothesis: "H₀", ci: "95%", estimators: "θ̂", mle: "L(θ)",
  chiSquared: "χ²", anova: "F",
  // finance
  interestRates: "(1+r)ⁿ", amortisation: "PMT", npv: "NPV", bonds: "YTM", binomialPricing: "↗↘", optionPricing: "S−K",
  // calculus
  differentiate: "d/dx", stationary: "f′=0", integrate: "∫dx", partials: "∂f", tangent: "y′", definite: "∫ₐᵇ", limits: "lim", implicit: "dy/dx",
  intTechniques: "∫u dv", improper: "∫∞", intApplications: "∫πy²", taylor: "Tₙ(x)", powerSeries: "Σaₙxⁿ", convergence: "Σ<∞",
  chainMulti: "∂z/∂t", extremaMulti: "∇f=λ", multipleIntegrals: "∬", changeVariables: "∬r", lineIntegrals: "∫F·dr", vectorTheorems: "∮=∬",
  odeFirst: "y′=ky", odeSecond: "y″", odeSystems: "x′=Ax", laplace: "ℒ", stability: "Re<0", bifurcations: "⑂", iteratedMaps: "f∘f",
  lyapunov: "λ>0", fourier: "∿", pdeClassify: "uₜₜ", separation: "XT",
  // analysis
  floatingPoint: "ε", supInf: "sup", seqLimits: "aₙ→L", epsilonDelta: "εδ", mvt: "f′(c)", riemann: "ΣfΔx", uniform: "fₙ⇉f", analytic: "f(z)",
  contour: "∮", laurent: "z⁻ⁿ", residueCalc: "Res", numroots: "⇢0", numint: "≈∫", interpolation: "⋰", numericalOde: "h·f",
  convergenceOrder: "eₙ²", lebesgueMeasure: "μ(A)", simpleIntegrals: "∫dμ", convergenceTheorems: "lim∫", linearSolvers: "LU", norms: "‖x‖",
  operatorNorms: "‖A‖", hilbertSpaces: "ℋ",
  // topology
  metrics: "d(x,y)", openClosed: "(a,b]", compactness: "[0,1]", connected: "⁐", topologies: "τ",
  // abstract algebra
  groups: "(G,∗)", elementOrder: "⟨g⟩", subgroups: "H≤G", permutations: "(123)", homomorphisms: "G/N", rings: "I⊲R", polyRings: "F[x]",
  fieldExt: "ℚ(√2)", finiteFields: "GF(4)", galois: "Gal",
  // optimisation and games
  linearProgramming: "Ax≤b", simplex: "⬠↗", convex: "∪f", normalForm: "2×2", mixedNash: "NE", backwardInduction: "←⋔",
  // machine learning
  descent: "∇↓", overfitting: "≋", precision: "P/R", clustering: "⁂", backprop: "∂L", softmax: "eᶻ/Σ",
};

const liveIcon = (kind: string) => {
  for (const g of MENUS) for (const s of g.sections) for (const e of s.items) if (isLiveEntry(e) && e.live === kind) return e.icon;
  return undefined;
};
const topicIcon = (skill: SkillId) => TOPICS.find((t) => t.skills.includes(skill))?.icon;

/** The mark of a roadmap item. */
export function itemGlyph(i: Item): string {
  if (isRead(i)) return `${TOPICS.find((t) => t.id === i.read)?.icon ?? ""}?`;
  if (!isSkill(i)) return liveIcon(isLab(i) ? i.lab : i.game) ?? "▶";
  if (hasIdeas(i.skill)) return IDEA_CARDS[HOME_IDEA[i.skill] ?? SKILL_IDEAS[i.skill][0]].glyph;
  return SKILL_GLYPHS[i.skill] ?? topicIcon(i.skill) ?? "•";
}
