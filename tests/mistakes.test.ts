// Mistakes the checker names: each one is recognised in the questions that can produce it, still counts as wrong, and
// never shadows a right answer or a form message; the inequality reader and standard form are read as people type them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ru } from "../src/locales/ru.ts";
import { ka } from "../src/locales/ka.ts";
import { verdictOf } from "../src/learner.ts";
import { MISTAKES, type MistakeId } from "../src/math/mistakes.ts";
import { check, exercise, LEVELS, preview, readIneq, trapInputs, type SkillId } from "../src/math/practice.ts";

const w = en.pracWords;

/** Where each mistake can happen. */
const WHERE: Record<Exclude<MistakeId, "sign">, [SkillId, (1 | 2 | 3)[]]> = {
  addAcross: ["fractions", [1, 2]],
  flipFirst: ["fractions", [2, 3]],
  addedToBoth: ["fractions", [1, 2, 3]],
  wholeTimesTop: ["fractions", [1, 2, 3]],
  squareTerms: ["expand", [3]],
  noMiddle: ["expand", [1]],
  negPower: ["indices", [1, 3]],
  powTimes: ["indices", [2]],
  subNeg: ["integers", [2, 3]],
  leftToRight: ["order", [1, 2, 3]],
  mulBeforePow: ["order", [2, 3]],
  grouped: ["order", [1]],
  truncated: ["rounding", [1, 2]],
  placeLost: ["rounding", [1, 2]],
  doubleRound: ["rounding", [1, 2]],
  fullUnit: ["rounding", [3]],
  noFlip: ["inequalities", [2, 3]],
  boundary: ["inequalities", [1, 2, 3]],
  compareFlip: ["compare", [1, 2, 3]],
  firstDigit: ["compare", [2]],
  longerDecimal: ["compare", [3]],
  negativeSize: ["compare", [3]],
  biggerBottom: ["compare", [3]],
  biggerTop: ["compareFractions", [2, 3]],
  sameGap: ["compareFractions", [2]],
  areaPerimeter: ["shapeArea", [1]],
  triangleHalf: ["shapeArea", [2]],
  unshadedPart: ["equivalent", [1]],
  partToPart: ["equivalent", [1]],
  fractionDigits: ["equivalent", [3]],
  topAsPieces: ["shadeFraction", [2, 3]],
  oneSideOnly: ["balance", [2]],
  scaledOutput: ["findRule", [1, 2]],
  undoOrder: ["findRule", [3]],
  scaledFigure: ["growingPattern", [1, 2]],
  joinedUnlike: ["sameExpression", [1]],
  firstTermOnly: ["sameExpression", [2, 3]],
  squareAsDouble: ["sameExpression", [3]],
  acuteObtuse: ["estimateAngle", [1, 2]],
  insideAngle: ["estimateAngle", [3]],
  wrongTotal: ["missingAngle", [1, 2]],
  notHalved: ["missingAngle", [3]],
  diagonalMirror: ["symmetryLines", [1, 2]],
  sixSquares: ["cubeNets", [1, 2]],
  nextToOpposite: ["cubeNets", [3]],
  swappedXY: ["coordinates", [1, 2, 3]],
  countedLines: ["readChart", [2, 3]],
  notDifference: ["readChart", [1, 2, 3]],
  flatMoving: ["graphStory", [1, 2, 3]],
  steepSlow: ["graphStory", [2, 3]],
  runOverRise: ["slope", [1, 2, 3]],
  countedEven: ["oneStroke", [1, 2]],
  fourOdd: ["oneStroke", [3]],
  degreeColours: ["colouring", [1, 2, 3]],
  oddLoop: ["colouring", [2, 3]],
  fewestRoads: ["shortestPath", [1, 2, 3]],
  greedyRoute: ["shortestPath", [1, 2, 3]],
  cheapestRoads: ["spanningTree", [2, 3]],
  evenForFour: ["divisibility", [3]],
  threeForNine: ["divisibility", [2, 3]],
  oddSix: ["divisibility", [3]],
  tenOnly: ["divisibility", [1, 2]],
  centsOneDigit: ["money", [1]],
  smallerFromLarger: ["money", [2]],
  oneOfEach: ["money", [3]],
  alignedRight: ["decimals", [1]],
  pointWrongWay: ["decimals", [2, 3]],
  addedNotScaled: ["ratio", [1, 2]],
  ratioAsFraction: ["ratio", [2, 3]],
  rateInverted: ["rate", [1, 2]],
  hourAhead: ["time", [1]],
  handsSwapped: ["time", [1]],
  minutes100: ["time", [2, 3]],
  timeAsDecimal: ["time", [2, 3]],
  hourNotCarried: ["time", [2, 3]],
  not24: ["time", [3]],
  twelveNotTen: ["time", [3]],
  minutesAsHours: ["rate", [2]],
  meanOfSpeeds: ["rate", [3]],
  meetDifference: ["rate", [3]],
  catchSum: ["rate", [3]],
  markAsOne: ["measure", [1]],
  rulerEnd: ["measure", [2]],
  lostZero: ["measure", [2]],
  notRegrouped: ["measure", [3]],
  smallerUnitFromLarger: ["measure", [3]],
  picturesCounted: ["diagrams", [1]],
  valueNotChange: ["diagrams", [2]],
  angleAsCount: ["diagrams", [3]],
  countAsAngle: ["diagrams", [3]],
  leafOnly: ["diagrams", [3]],
  largestAsRange: ["diagrams", [3]],
  notSupplement: ["trigRules", [1]],
  cosSignLost: ["trigRules", [1, 2]],
  sineRuleFlipped: ["trigRules", [2]],
  anglesAsSides: ["trigRules", [2]],
  noSquareRoot: ["trigRules", [2, 3]],
  wrongAngleFound: ["trigRules", [2]],
  areaNoSine: ["trigRules", [2]],
  areaNotHalved: ["trigRules", [2]],
  ambiguousAcute: ["trigRules", [3]],
  backBearingMirror: ["trigRules", [3]],
  bearingTurnInside: ["trigRules", [3]],
  fromVertical: ["trigRules", [3]],
  wholeCircle: ["arcs", [1]],
  arcAsArea: ["arcs", [1, 2]],
  areaAsArc: ["arcs", [1, 2]],
  perimeterNoRadii: ["arcs", [1]],
  radianFlipped: ["arcs", [2]],
  radiansAsDegrees: ["arcs", [2]],
  sectorNotHalved: ["arcs", [2, 3]],
  arcRatioFlipped: ["arcs", [3]],
  segmentNoTriangle: ["arcs", [3]],
  degreeMode: ["arcs", [3]],
  inverseAsDirect: ["proportion", [1, 2, 3]],
  directAsInverse: ["proportion", [1, 2]],
  powerIgnored: ["proportion", [3]],
  placeFromOne: ["bases", [1]],
  remaindersDown: ["bases", [2]],
  carryInTen: ["bases", [3]],
  noPlusOne: ["modular", [1]],
  cycleOffByOne: ["modular", [1, 3]],
  overPowerOfTen: ["modular", [2]],
  notReduced: ["modular", [2]],
  timesNotInverse: ["modular", [3]],
  flatTriangle: ["triangleInequality", [1]],
  noLowerBound: ["triangleInequality", [2]],
  isoscelesImpossible: ["triangleInequality", [3]],
  besideNotOpposite: ["triangleInequality", [3]],
  chordsAdded: ["powerPoint", [1]],
  secantChordOnly: ["powerPoint", [2, 3]],
  wholeSecant: ["powerPoint", [2, 3]],
  tangentNotRooted: ["powerPoint", [3]],
  cancelTerms: ["algFractions", [1, 3]],
  addTopsBottoms: ["algFractions", [2, 3]],
  subjectOrder: ["formulae", [2]],
  powerNotUndone: ["formulae", [3]],
  moreMeansAdd: ["barModels", [1]],
  postsAreGaps: ["barModels", [1]],
  oneStepOnly: ["barModels", [1]],
  sharedEqually: ["barModels", [2]],
  unitsMiscount: ["barModels", [2, 3]],
  loopExtraPost: ["barModels", [2]],
  givenOnlyOnce: ["barModels", [3]],
  leftShortSubtracted: ["barModels", [3]],
  otherEnd: ["ordinals", [1, 2]],
  wrongNeighbour: ["ordinals", [3]],
  repeatedLast: ["shapePatterns", [1]],
  distinctNotUnit: ["shapePatterns", [2]],
  remainderShift: ["shapePatterns", [2, 3]],
  exampleNotCounter: ["proofs", [3]],
  calledTrue: ["proofs", [3]],
  lookAlikeLine: ["proofs", [1, 2]],
  laterLine: ["proofs", [2]],
  vacuousTruth: ["logic", [1, 2]],
  exclusiveOr: ["logic", [1, 2]],
  converseSlip: ["logic", [3]],
  deMorganSlip: ["logic", [3]],
  negatedImplication: ["logic", [3]],
  allFromSome: ["quantifiers", [1]],
  existsNeedsAll: ["quantifiers", [1]],
  keptQuantifier: ["quantifiers", [2, 3]],
  swappedQuantifiers: ["quantifiers", [3]],
  unionIntersect: ["sets", [1]],
  differenceOrder: ["sets", [1]],
  complementInsideOnly: ["sets", [1]],
  doubleCounted: ["sets", [2]],
  productAsSum: ["sets", [2]],
  powerSetDouble: ["sets", [2]],
  tripleMissed: ["sets", [3]],
  missedTarget: ["mappings", [1, 2]],
  sharedTarget: ["mappings", [1, 2]],
  injSurjSwap: ["mappings", [1, 2]],
  compositionOrder: ["mappings", [3]],
  inverseReciprocal: ["mappings", [3]],
  missedLoop: ["relations", [1]],
  missedReverse: ["relations", [1]],
  missedChain: ["relations", [1]],
  classWithoutItself: ["relations", [2]],
  smallestOnly: ["relations", [3]],
  largestOnly: ["relations", [3]],
  missingBase: ["induction", [3]],
  denseNotUncountable: ["cardinality", [1]],
  boundedCountable: ["cardinality", [1]],
  signSwap: ["cardinality", [2]],
  diagonalDirection: ["cardinality", [2]],
  diagonalNotFlipped: ["cardinality", [3]],
  flippedRow: ["cardinality", [3]],
  substitutedZeroOverZero: ["limits", [1]],
  leadingTermsWrong: ["limits", [2]],
  oneToInfinity: ["limits", [2]],
  lhopitalNoChain: ["limits", [3]],
  oneSidedLimit: ["limits", [3]],
  droppedProductTerm: ["implicit", [2]],
  sameRateBothEnds: ["implicit", [3]],
  forgotRateFactor: ["implicit", [3]],
  forgotInnerFactor: ["intTechniques", [1, 3]],
  partsSignSlip: ["intTechniques", [2]],
  coverUpSwapped: ["intTechniques", [3]],
  pTestBackwards: ["improper", [1]],
  pTestAtZero: ["improper", [3]],
  dividedByOldPower: ["improper", [2]],
  onlyTopCurve: ["intApplications", [1]],
  forgotPi: ["intApplications", [2]],
  squaredAfterIntegrating: ["intApplications", [2]],
  forgotOnePlus: ["intApplications", [3]],
  forgotFactorial: ["taylor", [1, 2, 3]],
  wrongCentre: ["taylor", [3]],
  radiusInverted: ["powerSeries", [1, 2]],
  endpointsGuessed: ["powerSeries", [3]],
  termsToZeroMeansConverge: ["convergence", [1]],
  ratioOneDecides: ["convergence", [2]],
  conditionalAsAbsolute: ["convergence", [3]],
  alternatingAlwaysConverges: ["convergence", [3]],
  otherVariableZero: ["partials", [1]],
  partialsSwapped: ["partials", [1]],
  directionNotUnit: ["partials", [2]],
  planeNotThroughPoint: ["partials", [3]],
  chainOneTermOnly: ["chainMulti", [1, 3]],
  jacobianTransposed: ["chainMulti", [2]],
  chainWrongVariable: ["chainMulti", [3]],
  fxxAloneDecides: ["extremaMulti", [2]],
  hessianSignsSwapped: ["extremaMulti", [2]],
  gaveLambda: ["extremaMulti", [3]],
  minForMax: ["extremaMulti", [3]],
  forgotOtherWidth: ["multipleIntegrals", [1]],
  limitsAsConstants: ["multipleIntegrals", [2]],
  forgotJacobianR: ["changeVariables", [1, 2]],
  forgotSinPhi: ["changeVariables", [3]],
  sphericalNoRhoSquared: ["changeVariables", [3]],
  wrongPartialsCompared: ["lineIntegrals", [1]],
  potentialAtEndOnly: ["lineIntegrals", [2]],
  forgotDrDt: ["lineIntegrals", [3]],
  greenOrderSwapped: ["vectorTheorems", [1]],
  areaForVolume: ["vectorTheorems", [2]],
  curlSignSlip: ["vectorTheorems", [3]],
  constantAddedAfterExp: ["odeFirst", [1]],
  integratingFactorSign: ["odeFirst", [2]],
  exactAddedBoth: ["odeFirst", [3]],
  rootsSignFlipped: ["odeSecond", [1]],
  repeatedRootNoX: ["odeSecond", [2]],
  forgotExpFactor: ["odeSecond", [2]],
  undeterminedNoDerivatives: ["odeSecond", [3]],
  diagonalAsEigenvalues: ["odeSystems", [1]],
  stabilitySignSwapped: ["odeSystems", [2]],
  saddleAsNode: ["odeSystems", [2]],
  spiralAsNode: ["odeSystems", [2]],
  initialAsCoefficients: ["odeSystems", [3]],
  laplaceShiftSign: ["laplace", [1]],
  laplaceNoFactorial: ["laplace", [1]],
  laplaceSinCos: ["laplace", [1]],
  inverseShiftSign: ["laplace", [2]],
  initialValueDropped: ["laplace", [3]],
  equilibriumZeroLost: ["stability", [1]],
  semiStableMissed: ["stability", [2]],
  linearisedAtOrigin: ["stability", [3]],
  supInfSwapped: ["supInf", [1]],
  alternatingFirstTerm: ["supInf", [1]],
  boundAsAttained: ["supInf", [2]],
  limitAsBound: ["supInf", [2]],
  epsilonBoundaryN: ["supInf", [3]],
  forgotSquareRootN: ["supInf", [3]],
  forgotShiftN: ["seqLimits", [1]],
  negativeFixedPoint: ["seqLimits", [2]],
  fixedPointSign: ["seqLimits", [2]],
  averageAsLimit: ["seqLimits", [3]],
  missedZeroSubsequence: ["seqLimits", [3]],
  deltaTimesSlope: ["epsilonDelta", [1]],
  boundAtPointOnly: ["epsilonDelta", [2]],
  forgotMinOne: ["epsilonDelta", [2]],
  continuousMeansUniform: ["epsilonDelta", [3]],
  notCompactNotUniform: ["epsilonDelta", [3]],
  slopeAsC: ["mvt", [1]],
  midpointAsC: ["mvt", [1]],
  boundWrongEnd: ["mvt", [2]],
  forgotIntervalLength: ["mvt", [2]],
  remainderNoFactorial: ["mvt", [3]],
  remainderWrongPower: ["mvt", [3]],
  otherDarbouxSum: ["riemann", [1]],
  sumWithoutWidth: ["riemann", [1, 2]],
  discontinuousNotIntegrable: ["riemann", [3]],
  boundedMeansIntegrable: ["riemann", [3]],
  improperAsRiemann: ["riemann", [3]],
  pointwiseLimitJump: ["uniform", [1]],
  supAtEndpoint: ["uniform", [2]],
  pointwiseMeansUniform: ["uniform", [3]],
  continuousLimitMeansUniform: ["uniform", [3]],
  supNotComputed: ["uniform", [3]],
  missesZero: ["subspaces", [1]],
  notClosed: ["subspaces", [1]],
  coefficientsSwapped: ["subspaces", [2]],
  firstTwoRowsOnly: ["subspaces", [2]],
  countedVectors: ["subspaces", [3]],
  pairwiseMeansIndependent: ["basis", [1]],
  coordsStandardBasis: ["basis", [2]],
  degreeNotDimension: ["basis", [3]],
  constraintIgnored: ["basis", [3]],
  rankFromNonzeroRows: ["rankNullity", [1]],
  nullityFromRows: ["rankNullity", [2]],
  rowNotNull: ["rankNullity", [3]],
  affineAsLinear: ["linearMaps", [1]],
  imagesAsRows: ["linearMaps", [2]],
  conjugatedWrongWay: ["linearMaps", [3]],
  standardInnerProduct: ["innerProducts", [1]],
  dividedByLength: ["innerProducts", [2]],
  lineThroughTwoPoints: ["innerProducts", [3]],
  repeatedMeansNot: ["spectral", [1]],
  countedEigenvalues: ["spectral", [1]],
  eigenvaluesOutOfOrder: ["spectral", [2]],
  poweredEntries: ["spectral", [3]],
  forgotSquareRoot: ["svd", [1, 2]],
  onlyNextValue: ["svd", [2]],
  outerProductOrder: ["svd", [3]],
  iSquaredPlusOne: ["complex", [1]],
  likePartsOnly: ["complex", [1]],
  conjugateTopOnly: ["complex", [2]],
  modulusNoRoot: ["complex", [2]],
  minusBForgotten: ["complex", [3]],
  halvedOnlyB: ["complex", [3]],
  cosSinSwapped: ["polarForm", [1]],
  anglesMultiplied: ["polarForm", [2]],
  lengthsAdded: ["polarForm", [2]],
  quotientAnglesAdded: ["polarForm", [2]],
  arctanQuadrant: ["polarForm", [3]],
  modulusNotPowered: ["deMoivre", [1]],
  argumentNotMultiplied: ["deMoivre", [1]],
  rootModulusNotRooted: ["deMoivre", [2]],
  rootsAngleNotDivided: ["deMoivre", [2]],
  locusCentreSign: ["deMoivre", [3]],
  locusFullLine: ["deMoivre", [3]],
  partForWhole: ["kakooma", [1, 2, 3]],
  usedTwice: ["kakooma", [1, 2, 3]],
  sumNotProduct: ["kakooma", [3]],
  parityIgnored: ["parity", [1, 2, 3]],
  beyondReach: ["parity", [2, 3]],
  neighboursOnly: ["inversions", [1, 2, 3]],
  outOfPlace: ["inversions", [1, 2, 3]],
  uphill: ["descent", [1, 2]],
  noTwo: ["backprop", [2, 3]],
  reluOff: ["backprop", [3]],
  noMinusOne: ["softmax", [3]],
  trainError: ["overfitting", [2]],
  bestEpoch: ["overfitting", [3]],
  swappedPR: ["precision", [1, 3]],
  notReducedMod: ["groups", [1]],
  inverseWrongOperation: ["groups", [1]],
  reciprocalNotMod: ["groups", [1]],
  onlyRotations: ["groups", [1]],
  identityIsUsual: ["groups", [2]],
  inverseIsUsual: ["groups", [2]],
  inverseOfUsualIdentity: ["groups", [2]],
  closureNotChecked: ["groups", [3]],
  inversesNotChecked: ["groups", [3]],
  associativityNotChecked: ["groups", [3]],
  groupAxiomsHold: ["groups", [3]],
  orderIsElement: ["elementOrder", [1, 2]],
  orderIsGroupSize: ["elementOrder", [1, 2]],
  orderIsGcd: ["elementOrder", [1]],
  orderAdditive: ["elementOrder", [2]],
  generatorsAllNonzero: ["elementOrder", [3]],
  generatorsArePrimes: ["elementOrder", [3]],
  orderProductNotLcm: ["elementOrder", [3]],
  indexSubtracted: ["subgroups", [1]],
  forgotTrivialSubgroups: ["subgroups", [1]],
  forgotIdentity: ["subgroups", [2]],
  noWrapAround: ["subgroups", [2]],
  cosetIsSubgroup: ["subgroups", [3]],
  indexIsOrder: ["subgroups", [3]],
  orderSumNotLcm: ["permutations", [1]],
  composedLeftToRight: ["permutations", [2]],
  cycleLengthParity: ["permutations", [3]],
  cycleRotationsCounted: ["permutations", [3]],
  isoTheoremSubtracted: ["homomorphisms", [1]],
  imageForKernel: ["homomorphisms", [2]],
  orderInGNotQuotient: ["homomorphisms", [3]],
  subgroupAssumedNormal: ["homomorphisms", [3]],
  normalMissed: ["homomorphisms", [3]],
  lastQuotientAsGcd: ["bezout", [1]],
  coprimeNeeded: ["bezout", [1]],
  solvableWithoutGcd: ["bezout", [1]],
  bezoutSignSlip: ["bezout", [2]],
  nonnegativeCounted: ["bezout", [3]],
  stepNotDivided: ["bezout", [3]],
  onlyOneSolution: ["congruences", [2, 3]],
  modulusNotDivided: ["congruences", [2, 3]],
  crtForgotInverse: ["crt", [1, 2]],
  crtFirstTwoOnly: ["crt", [2]],
  crtProductNotLcm: ["crt", [3]],
  phiAsPrime: ["fermatEuler", [1]],
  phiPowersIgnored: ["fermatEuler", [1]],
  exponentModN: ["fermatEuler", [2]],
  exponentModNMinusOne: ["fermatEuler", [2]],
  phiOfPNotPMinusOne: ["fermatEuler", [3]],
  primitiveRootsNonresidues: ["fermatEuler", [3]],
  wilsonSign: ["fermatEuler", [3]],
  eNotCoprime: ["rsa", [1]],
  inverseModN: ["rsa", [2]],
  rsaMultiplied: ["rsa", [3]],
  rsaWrongKey: ["rsa", [3]],
  squaresNotReduced: ["residues", [1]],
  zeroAsResidue: ["residues", [1]],
  eulerExponentWrong: ["residues", [2]],
  squareOnlyIfPerfect: ["residues", [2]],
  reciprocitySignIgnored: ["residues", [3]],
  reciprocitySignAlways: ["residues", [3]],
  densityHeightOne: ["densities", [1]],
  constantNotInverted: ["densities", [1]],
  uniformLengthOnly: ["densities", [2]],
  cdfIsDensity: ["densities", [2]],
  exponentialCdfForSurvival: ["densities", [2]],
  densityForProbability: ["densities", [2]],
  meanIsMidpoint: ["densities", [3]],
  expectationWithoutX: ["densities", [3]],
  exponentialMeanIsRate: ["densities", [3]],
  marginalOneCell: ["jointDist", [1]],
  conditionalNotDivided: ["jointDist", [2]],
  conditionedWrongWay: ["jointDist", [2]],
  covarianceNoSubtraction: ["jointDist", [3]],
  covarianceSignFlipped: ["jointDist", [3]],
  independenceOneCell: ["jointDist", [3]],
  mgfAtZero: ["mgf", [1]],
  secondMomentAsVariance: ["mgf", [2]],
  varianceSubtracted: ["mgf", [3]],
  coefficientsNotSquared: ["mgf", [3]],
  mgfExponentsMultiplied: ["mgf", [3]],
  varianceNotDivided: ["limitTheorems", [1]],
  rootNConfused: ["limitTheorems", [1]],
  cltForgotRootN: ["limitTheorems", [2]],
  normalWrongTail: ["limitTheorems", [2, 3]],
  sumSdLinear: ["limitTheorems", [3]],
  continuityCorrectionMissed: ["limitTheorems", [3]],
  squaredOneEntry: ["markov", [1]],
  columnForRow: ["markov", [1]],
  matrixTimesVector: ["markov", [2]],
  stationaryFlipped: ["markov", [3]],
  stationaryFromDiagonal: ["markov", [3]],
  returnTimeIsProbability: ["markov", [3]],
};

test("every mistake is named in a question that can produce it, and still counts as wrong", () => {
  for (const id of MISTAKES) {
    if (id === "sign") continue;
    const [skill, levels] = WHERE[id];
    let found = false;
    for (const level of levels)
      for (let seed = 1; seed <= 400 && !found; seed++) {
        const ex = exercise(skill, level, seed, w);
        const trap: { id: MistakeId; input: string } | undefined = trapInputs(ex).find((t) => t.id === id);
        if (!trap) continue;
        const v = check(ex, trap.input, w);
        assert.equal(v.mistake, id, `${skill} ${level} #${seed}: ${ex.q || ex.prompt} typed ${trap.input}`);
        assert.equal(v.ok, false);
        assert.equal(v.why, undefined, "a mistake isn't sent back like a form slip");
        assert.equal(verdictOf(v), "wrong", "it counts as a miss");
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), `${id}: every number in the hint is filled in: ${v.hint}`);
        found = true;
      }
    assert.ok(found, `no question has a ${id} trap`);
  }
});

test("right size, wrong sign: for numbers, roots and expressions", () => {
  const times = exercise("times", 1, 5, w);
  assert.equal(check(times, `-${times.plain}`, w).mistake, "sign");
  const quad = (() => {
    for (let seed = 1; ; seed++) {
      const ex = exercise("quadratic", 1, seed, w);
      if (ex.answer.k === "set" && ex.answer.vs.some((v) => v !== 0) && ex.answer.vs.reduce((s, v) => s + v, 0) !== 0) return ex;
    }
  })();
  if (quad.answer.k !== "set") throw new Error("unreachable");
  assert.equal(check(quad, quad.answer.vs.map((v) => -v).join("; "), w).mistake, "sign", "roots all negated: (x − 3)(x + 2) read as 3 and −2 swapped round");
  const diff = exercise("differentiate", 1, 4, w);
  assert.equal(check(diff, `-(${diff.plain})`, w).mistake, "sign");
  // Zero has no wrong sign.
  const zero = { ...times, answer: { k: "num" as const, v: 0, tol: 1e-9 } };
  assert.equal(check(zero, "-0", w).ok, true);
});

test("no trap is the right answer, and every trap is named, in every question that has one", () => {
  const skills: SkillId[] = ["fractions", "expand", "indices", "integers", "order", "rounding", "inequalities", "compare", "compareFractions", "money", "time", "measure", "diagrams", "trigRules", "arcs", "proportion", "algFractions", "formulae", "bases", "modular", "triangleInequality", "powerPoint", "barModels", "ordinals", "shapePatterns", "proofs", "logic", "quantifiers", "sets", "mappings", "relations", "induction", "cardinality", "limits", "implicit", "intTechniques", "improper", "intApplications", "taylor", "powerSeries", "convergence", "partials", "chainMulti", "extremaMulti", "multipleIntegrals", "changeVariables", "lineIntegrals", "vectorTheorems", "odeFirst", "odeSecond", "odeSystems", "laplace", "stability", "supInf", "seqLimits", "epsilonDelta", "mvt", "riemann", "uniform", "subspaces", "basis", "rankNullity", "linearMaps", "innerProducts", "spectral", "svd", "complex", "polarForm", "deMoivre", "bezout", "congruences", "crt", "fermatEuler", "rsa", "residues", "densities", "jointDist", "mgf", "limitTheorems", "markov", "groups", "elementOrder", "subgroups", "permutations", "homomorphisms", "decimals", "ratio", "rate", "descent", "backprop", "softmax", "overfitting", "precision"];
  for (const skill of skills)
    for (const level of LEVELS)
      for (let seed = 1; seed <= 150; seed++) {
        const ex = exercise(skill, level, seed, w);
        assert.equal(trapInputs(ex).length, ex.answer.traps?.length ?? 0, "every trap can be typed");
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, w);
          const where = `${skill} ${level} #${seed}: ${ex.q || ex.prompt} → ${ex.plain}; ${t.id} ${t.input}`;
          assert.equal(v.ok, false, where);
          assert.ok(v.mistake, where);
        }
      }
});

test("a form message or a plain miss is not dressed up as a mistake", () => {
  const frac = exercise("fractions", 1, 3, w);
  const [n, d] = frac.plain.split("/").map(Number);
  if (d) assert.deepEqual(check(frac, `${2 * n}/${2 * d}`, w), { ok: false, close: true, why: w.reasons.notLowest });
  const times = exercise("times", 2, 9, w);
  assert.deepEqual(check(times, String(Number(times.plain) + 1), w), { ok: false });
});

test("a number asked for, an expression given: sent back, not marked", () => {
  const lin = exercise("linear", 1, 2, w);
  const v = check(lin, "x + 3", w);
  assert.equal(v.why, w.reasons.notNumber.replace("{s}", "x + 3"));
  assert.equal(verdictOf(v), "form");
  assert.match(check(lin, "x +", w).why ?? "", /Couldn't read/);
});

test("inequalities are read however they are written", () => {
  const ends = (s: string) => readIneq(s);
  assert.deepEqual(ends("x >= 4"), { lo: { v: 4, closed: true }, hi: null });
  assert.deepEqual(ends("x ≥ 4"), ends("x >= 4"));
  assert.deepEqual(ends("4 <= x"), ends("x >= 4"));
  assert.deepEqual(ends("4 ≤ x"), ends("x >= 4"));
  assert.deepEqual(ends("x < -2"), { lo: null, hi: { v: -2, closed: false } });
  assert.deepEqual(ends("x < −2"), ends("x < -2"));
  assert.deepEqual(ends("-1 < x <= 3"), { lo: { v: -1, closed: false }, hi: { v: 3, closed: true } });
  assert.deepEqual(ends("3 >= x > -1"), ends("-1 < x <= 3"));
  assert.deepEqual(ends("(-1, 3]"), ends("-1 < x <= 3"));
  assert.deepEqual(ends("(-1; 3]"), ends("-1 < x <= 3"));
  assert.deepEqual(ends("[4, ∞)"), ends("x >= 4"));
  assert.deepEqual(ends("(-inf, -2)"), ends("x < -2"));
  assert.deepEqual(ends("x > 2,5"), { lo: { v: 2.5, closed: false }, hi: null }, "a decimal comma");
  assert.deepEqual(ends("x > 1/2"), { lo: { v: 0.5, closed: false }, hi: null });
  for (const bad of ["x = 4", "4", "x", "1 < x > 3", "(1, 2, 3)", "(-∞, ∞)", "x > y"]) assert.equal(ends(bad), null, bad);

  const ex = exercise("inequalities", 1, 1, w);
  assert.equal(check(ex, ex.plain.replace(">=", "≥").replace("<=", "≤"), w).ok, true);
  assert.equal(check(ex, ex.plain.replace(/^x (\S+) (\S+)$/, (_, r, v) => `${v} ${{ "<": ">", "<=": ">=", ">": "<", ">=": "<=" }[r as "<"]} x`), w).ok, true, "the number first");
  assert.equal(check(ex, "4", w).why, w.reasons.notIneq);
});

test("standard form: e-notation and × read where it is asked for, and the form is checked", () => {
  const find = () => {
    for (let seed = 1; ; seed++) {
      const ex = exercise("rounding", 2, seed, w);
      if (ex.format === "standard") return ex;
    }
  };
  const ex = find();
  const [m, e] = ex.plain.split("*10^");
  assert.equal(check(ex, ex.plain, w).ok, true);
  assert.equal(check(ex, `${m}e${e}`, w).ok, true);
  assert.equal(check(ex, `${m} × 10^(${e})`, w).ok, true);
  assert.equal(check(ex, `${m}x10^${e}`, w).ok, true);
  const value = Number(m) * 10 ** Number(e);
  assert.deepEqual(check(ex, String(value), w), { ok: false, close: true, why: w.reasons.notStandard }, "the right value, not in standard form");
  assert.equal(check(ex, `${Number(m) * 10}*10^${Number(e) - 1}`, w).why, w.reasons.notStandard, "a number of 10 or more in front");
  assert.equal(check(ex, `-${m}e${e}`, w).mistake, "sign", "the wrong sign, in e-notation");
  // Tiny answers are compared relatively: within 10⁻⁹ of 7.31 × 10⁻¹² is not close enough.
  for (let seed = 1; seed <= 400; seed++) {
    const q = exercise("rounding", 2, seed, w);
    if (q.format !== "standard" || q.answer.k !== "num" || q.answer.v > 1e-6) continue;
    const [qm, qe] = q.plain.split("*10^");
    assert.equal(check(q, `9*10^${Number(qe) + 2}`, w).ok, false, `${q.plain}: 9*10^${Number(qe) + 2}`);
    assert.equal(check(q, `-${qm}*10^${qe}`, w).ok, false);
    assert.equal(check(q, q.plain, w).ok, true);
  }
});

test("the preview reads ∞ and inf as infinity, not as the variable", () => {
  const ex = exercise("inequalities", 1, 1, w);
  assert.equal(preview(ex, "[4, inf)"), preview(ex, "x >= 4"));
  assert.equal(preview(ex, "(-infinity, 3]"), preview(ex, "x <= 3"));
  assert.equal(preview(ex, "y > 2"), "y > 2");
});

test("order of operations: never a ÷ b(c + d), and rounding lands on the unit and within half of it", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) assert.doesNotMatch(exercise("order", level, seed, w).q, /\\div \d+\s*\(/);
  for (let seed = 1; seed <= 300; seed++) {
    const ex = exercise("rounding", 1, seed, w);
    const m = ex.prompt.match(/^Round (\S+) to the nearest (\d+)\.$/);
    if (!m || ex.answer.k !== "num") continue;
    const [n, unit] = [Number(m[1]), Number(m[2])];
    assert.equal(ex.answer.v % unit, 0, ex.prompt);
    assert.ok(Math.abs(ex.answer.v - n) < unit / 2, ex.prompt);
  }
});

test("every mistake is explained in every language", () => {
  for (const words of [en, ru, ka].map((l) => l.pracWords))
    for (const id of MISTAKES) assert.ok(words.mistakes[id].length > 20, `${id}`);
});
