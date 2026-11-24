// Every practice skill's generator, one file each: GENS maps a skill to the function that makes its question for a
// level and a random source. TypeScript checks that each skill in practiceSkills.ts has exactly one. A new skill is
// a file here, an import and an entry below, its id in practiceSkills.ts and curriculum.ts, and its words.
import type { SkillId } from "../practiceSkills";
import type { Gen } from "../practiceTypes";
import compare from "./compare";
import quickLook from "./quickLook";
import ordinals from "./ordinals";
import estimateLine from "./estimateLine";
import closerTo from "./closerTo";
import placeValue from "./placeValue";
import addSubtract from "./addSubtract";
import tables from "./tables";
import divide from "./divide";
import times from "./times";
import money from "./money";
import time from "./time";
import measure from "./measure";
import makeTarget from "./makeTarget";
import kakooma from "./kakooma";
import makeWhole from "./makeWhole";
import equivalent from "./equivalent";
import orderFractions from "./orderFractions";
import shadeFraction from "./shadeFraction";
import integers from "./integers";
import order from "./order";
import compareFractions from "./compareFractions";
import fractions from "./fractions";
import decimals from "./decimals";
import percent from "./percent";
import convert from "./convert";
import ratio from "./ratio";
import rate from "./rate";
import barModels from "./barModels";
import rounding from "./rounding";
import divisibility from "./divisibility";
import hcf from "./hcf";
import primes from "./primes";
import squares from "./squares";
import bases from "./bases";
import modular from "./modular";
import balance from "./balance";
import shapePatterns from "./shapePatterns";
import findRule from "./findRule";
import growingPattern from "./growingPattern";
import sameExpression from "./sameExpression";
import graphStory from "./graphStory";
import linear from "./linear";
import proportion from "./proportion";
import inequalities from "./inequalities";
import expand from "./expand";
import factor from "./factor";
import algFractions from "./algFractions";
import formulae from "./formulae";
import quadratic from "./quadratic";
import simultaneous from "./simultaneous";
import polynomials from "./polynomials";
import indices from "./indices";
import logs from "./logs";
import surds from "./surds";
import sequences from "./sequences";
import series from "./series";
import functions from "./functions";
import matrices from "./matrices";
import determinant from "./determinant";
import elimination from "./elimination";
import eigen from "./eigen";
import shapeArea from "./shapeArea";
import areaPerimeter from "./areaPerimeter";
import estimateAngle from "./estimateAngle";
import missingAngle from "./missingAngle";
import triangleInequality from "./triangleInequality";
import symmetryLines from "./symmetryLines";
import cubeNets from "./cubeNets";
import coordinates from "./coordinates";
import slope from "./slope";
import line from "./line";
import distance from "./distance";
import trigexact from "./trigexact";
import righttri from "./righttri";
import practicalTrig from "./practicalTrig";
import trigRules from "./trigRules";
import circles from "./circles";
import powerPoint from "./powerPoint";
import arcs from "./arcs";
import similarity from "./similarity";
import volume from "./volume";
import identities from "./identities";
import vectors from "./vectors";
import dotangle from "./dotangle";
import projection from "./projection";
import differentiate from "./differentiate";
import tangent from "./tangent";
import stationary from "./stationary";
import integrate from "./integrate";
import definite from "./definite";
import numroots from "./numroots";
import numint from "./numint";
import descent from "./descent";
import backprop from "./backprop";
import readChart from "./readChart";
import diagrams from "./diagrams";
import oneStroke from "./oneStroke";
import colouring from "./colouring";
import shortestPath from "./shortestPath";
import spanningTree from "./spanningTree";
import parity from "./parity";
import inversions from "./inversions";
import average from "./average";
import probability from "./probability";
import counting from "./counting";
import ci from "./ci";
import expectation from "./expectation";
import conditional from "./conditional";
import distributions from "./distributions";
import correlation from "./correlation";
import hypothesis from "./hypothesis";
import softmax from "./softmax";
import overfitting from "./overfitting";
import precision from "./precision";
import clustering from "./clustering";
import proofs from "./proofs";
import logic from "./logic";
import quantifiers from "./quantifiers";
import sets from "./sets";
import mappings from "./mappings";
import relations from "./relations";
import induction from "./induction";
import cardinality from "./cardinality";
import limits from "./limits";
import implicit from "./implicit";
import intTechniques from "./intTechniques";
import improper from "./improper";
import intApplications from "./intApplications";
import taylor from "./taylor";
import powerSeries from "./powerSeries";
import convergence from "./convergence";
import partials from "./partials";
import chainMulti from "./chainMulti";
import extremaMulti from "./extremaMulti";
import multipleIntegrals from "./multipleIntegrals";
import changeVariables from "./changeVariables";
import lineIntegrals from "./lineIntegrals";
import vectorTheorems from "./vectorTheorems";
import odeFirst from "./odeFirst";
import odeSecond from "./odeSecond";
import odeSystems from "./odeSystems";
import laplace from "./laplace";
import stability from "./stability";
import bifurcations from "./bifurcations";
import iteratedMaps from "./iteratedMaps";
import lyapunov from "./lyapunov";
import supInf from "./supInf";
import seqLimits from "./seqLimits";
import epsilonDelta from "./epsilonDelta";
import mvt from "./mvt";
import riemann from "./riemann";
import uniform from "./uniform";
import subspaces from "./subspaces";
import basis from "./basis";
import rankNullity from "./rankNullity";
import linearMaps from "./linearMaps";
import innerProducts from "./innerProducts";
import spectral from "./spectral";
import svd from "./svd";
import complex from "./complex";
import polarForm from "./polarForm";
import deMoivre from "./deMoivre";
import groups from "./groups";
import elementOrder from "./elementOrder";
import subgroups from "./subgroups";
import permutations from "./permutations";
import homomorphisms from "./homomorphisms";
import rings from "./rings";
import polyRings from "./polyRings";
import fieldExt from "./fieldExt";
import finiteFields from "./finiteFields";
import galois from "./galois";
import metrics from "./metrics";
import openClosed from "./openClosed";
import compactness from "./compactness";
import connected from "./connected";
import topologies from "./topologies";
import estimators from "./estimators";
import mle from "./mle";
import regression from "./regression";
import chiSquared from "./chiSquared";
import anova from "./anova";
import bayes from "./bayes";
import floatingPoint from "./floatingPoint";
import interpolation from "./interpolation";
import numericalOde from "./numericalOde";
import linearSolvers from "./linearSolvers";
import convergenceOrder from "./convergenceOrder";
import fourier from "./fourier";
import pdeClassify from "./pdeClassify";
import separation from "./separation";
import curves from "./curves";
import surfaces from "./surfaces";
import nonEuclidean from "./nonEuclidean";
import projective from "./projective";
import linearProgramming from "./linearProgramming";
import simplex from "./simplex";
import convex from "./convex";
import normalForm from "./normalForm";
import mixedNash from "./mixedNash";
import backwardInduction from "./backwardInduction";
import discreteLog from "./discreteLog";
import elGamal from "./elGamal";
import ellipticCurves from "./ellipticCurves";
import lebesgueMeasure from "./lebesgueMeasure";
import simpleIntegrals from "./simpleIntegrals";
import convergenceTheorems from "./convergenceTheorems";
import norms from "./norms";
import operatorNorms from "./operatorNorms";
import hilbertSpaces from "./hilbertSpaces";
import randomWalks from "./randomWalks";
import poissonProcess from "./poissonProcess";
import brownian from "./brownian";
import interestRates from "./interestRates";
import amortisation from "./amortisation";
import npv from "./npv";
import bonds from "./bonds";
import currency from "./currency";
import inflation from "./inflation";
import binomialPricing from "./binomialPricing";
import optionPricing from "./optionPricing";
import bezout from "./bezout";
import congruences from "./congruences";
import crt from "./crt";
import fermatEuler from "./fermatEuler";
import rsa from "./rsa";
import residues from "./residues";
import densities from "./densities";
import jointDist from "./jointDist";
import mgf from "./mgf";
import limitTheorems from "./limitTheorems";
import markov from "./markov";
import recurrences from "./recurrences";
import growth from "./growth";
import generating from "./generating";
import inclusionExclusion from "./inclusionExclusion";
import pigeonhole from "./pigeonhole";
import graphTheory from "./graphTheory";
import normalForms from "./normalForms";
import structures from "./structures";
import ordinalArith from "./ordinalArith";
import analytic from "./analytic";
import contour from "./contour";
import laurent from "./laurent";
import residueCalc from "./residueCalc";

export const GENS: Record<SkillId, Gen> = {
  compare,
  quickLook,
  ordinals,
  estimateLine,
  closerTo,
  placeValue,
  addSubtract,
  tables,
  divide,
  times,
  money,
  time,
  measure,
  makeTarget,
  kakooma,
  makeWhole,
  equivalent,
  orderFractions,
  shadeFraction,
  integers,
  order,
  compareFractions,
  fractions,
  decimals,
  percent,
  convert,
  ratio,
  rate,
  barModels,
  rounding,
  divisibility,
  hcf,
  primes,
  squares,
  bases,
  modular,
  balance,
  shapePatterns,
  findRule,
  growingPattern,
  sameExpression,
  graphStory,
  linear,
  proportion,
  inequalities,
  expand,
  factor,
  algFractions,
  formulae,
  quadratic,
  simultaneous,
  polynomials,
  indices,
  logs,
  surds,
  sequences,
  series,
  functions,
  matrices,
  determinant,
  elimination,
  eigen,
  shapeArea,
  areaPerimeter,
  estimateAngle,
  missingAngle,
  triangleInequality,
  symmetryLines,
  cubeNets,
  coordinates,
  slope,
  line,
  distance,
  trigexact,
  righttri,
  practicalTrig,
  trigRules,
  circles,
  powerPoint,
  arcs,
  similarity,
  volume,
  identities,
  vectors,
  dotangle,
  projection,
  differentiate,
  tangent,
  stationary,
  integrate,
  definite,
  numroots,
  numint,
  descent,
  backprop,
  readChart,
  diagrams,
  oneStroke,
  colouring,
  shortestPath,
  spanningTree,
  parity,
  inversions,
  average,
  probability,
  counting,
  ci,
  expectation,
  conditional,
  distributions,
  correlation,
  hypothesis,
  softmax,
  overfitting,
  precision,
  clustering,
  proofs,
  logic,
  quantifiers,
  sets,
  mappings,
  relations,
  induction,
  cardinality,
  limits,
  implicit,
  intTechniques,
  improper,
  intApplications,
  taylor,
  powerSeries,
  convergence,
  partials,
  chainMulti,
  extremaMulti,
  multipleIntegrals,
  changeVariables,
  lineIntegrals,
  vectorTheorems,
  odeFirst,
  odeSecond,
  odeSystems,
  laplace,
  stability,
  bifurcations,
  iteratedMaps,
  lyapunov,
  supInf,
  seqLimits,
  epsilonDelta,
  mvt,
  riemann,
  uniform,
  subspaces,
  basis,
  rankNullity,
  linearMaps,
  innerProducts,
  spectral,
  svd,
  complex,
  polarForm,
  deMoivre,
  groups,
  elementOrder,
  subgroups,
  permutations,
  homomorphisms,
  rings,
  polyRings,
  fieldExt,
  finiteFields,
  galois,
  metrics,
  openClosed,
  compactness,
  connected,
  topologies,
  estimators,
  mle,
  regression,
  chiSquared,
  anova,
  bayes,
  floatingPoint,
  interpolation,
  numericalOde,
  linearSolvers,
  convergenceOrder,
  fourier,
  pdeClassify,
  separation,
  curves,
  surfaces,
  nonEuclidean,
  projective,
  linearProgramming,
  simplex,
  convex,
  normalForm,
  mixedNash,
  backwardInduction,
  discreteLog,
  elGamal,
  ellipticCurves,
  lebesgueMeasure,
  simpleIntegrals,
  convergenceTheorems,
  norms,
  operatorNorms,
  hilbertSpaces,
  randomWalks,
  poissonProcess,
  brownian,
  interestRates,
  amortisation,
  npv,
  bonds,
  currency,
  inflation,
  binomialPricing,
  optionPricing,
  bezout,
  congruences,
  crt,
  fermatEuler,
  rsa,
  residues,
  densities,
  jointDist,
  mgf,
  limitTheorems,
  markov,
  recurrences,
  growth,
  generating,
  inclusionExclusion,
  pigeonhole,
  graphTheory,
  normalForms,
  structures,
  ordinalArith,
  analytic,
  contour,
  laurent,
  residueCalc,
};
