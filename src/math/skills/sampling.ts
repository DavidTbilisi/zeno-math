// Practice: samples and study design (#653). Easy: the population or the sample, a fair sample, a fair question. Medium:
// an estimate for the population from a random sample, and the name of a way of sampling. Hard: an observational study
// or an experiment, a plan that can show a cause, and, in a new setting, which conclusion a study allows. The sample
// taken for the population, a handy sample taken for fair, a leading question taken for fair, the sample's count or
// percentage given for the estimate, cluster and stratified swapped, every tenth taken for simple random, the kind of
// study mixed up, groups that choose themselves or no group to compare, a cause read from an observation and a sample
// stretched to people it never reached are slips. #741 adds, on half the seeds: which question is statistical, which
// survey is a census and the parts of an investigative question; which claim a survey supports, the kind of bias and
// the way of sampling that fits a goal; and draws with and without replacement, the kind of experiment, an
// experiment's flaw and how far a random sample's result reaches.
import { fill } from "../chart";
import { fp, fracPart, ft, tf } from "../partKit";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";

type Slip = { id: Trap["id"]; at: number; vars?: Record<string, string | number> };

const gen: Gen = (r, L, w) => {
  const W = w.smp;
  /** A pick from options in a shuffled order; `right` and each slip's `at` index the options as given. */
  const pick = (options: string[], right: number, traps: Slip[], prompt: string, steps: string[]): Part => {
    const order = options.map((_, i) => i).sort(() => r.next() - 0.5);
    const opts = order.map((i) => ({ text: options[i], plain: options[i], tex: `\\text{${options[i].replace(/%/g, "\\%")}}` }));
    const at = (i: number) => order.indexOf(i);
    return {
      prompt, q: "",
      answer: { k: "pick", options: opts, right: at(right), traps: traps.map((t) => ({ id: t.id, a: { k: "pick", options: opts, right: at(t.at) }, vars: t.vars })) },
      show: opts[at(right)].tex, plain: options[right], format: "pick", steps,
    };
  };

  /** #741: the study-design kinds Khan asks for that the first set did not, sent half the seeds. */
  const more = (): Part => {
    const K = w.smK;
    if (L === 1) {
      const t = r.pick(["statQ", "census", "parts"] as const);
      if (t === "statQ") {
        const [good, ...bad] = r.pick([[K.sqSleep, K.sqSleepMe, K.sqSleepDay], [K.sqDogs, K.sqDogsMine, K.sqDogsLegs]] as const);
        return pick([good, ...bad], 0, [1, 2].map((at) => ({ id: "oneAnswerQuestion" as const, at, vars: { q: good } })), K.whichStatQ, [`\\text{${K.statQStep}}`]);
      }
      if (t === "census") {
        const [good, ...bad] = r.pick([[K.ceSchool, K.ceSchoolSome, K.ceSchoolClass], [K.ceTrees, K.ceTreesSome, K.ceTreesStreet]] as const);
        return pick([good, ...bad], 0, [1, 2].map((at) => ({ id: "sampleAsCensus" as const, at, vars: { c: good } })), K.whichCensus, [`\\text{${K.censusStep}}`]);
      }
      const [q, pop, vr, sum] = r.pick([[K.ipSleep, K.ipSleepPop, K.ipSleepVar, K.ipSleepSum], [K.ipBus, K.ipBusPop, K.ipBusVar, K.ipBusSum]] as const);
      const askPop = r.next() < 0.5;
      const vars = { pop, vr, o: sum };
      return pick([pop, vr, sum], askPop ? 0 : 1, [{ id: "componentsSwapped", at: askPop ? 1 : 0, vars }, { id: "summaryAsComponent", at: 2, vars }],
        fill(askPop ? K.whichPop : K.whichVar, { q }), [`\\text{${fill(K.partsStep, vars)}}`]);
    }
    if (L === 2) {
      const t = r.pick(["claim", "bias", "goal"] as const);
      if (t === "claim") {
        for (;;) {
          const N = r.pick([400, 600, 800, 1200]);
          const n = r.pick([40, 50, 80, 100]);
          const k = r.int(Math.ceil(n / 5), Math.floor((4 * n) / 5));
          const p = (100 * k) / n;
          const v = (N * k) / n;
          if (!Number.isInteger(p) || !Number.isInteger(v)) continue;
          const vars = { n, N, k, p, v };
          return pick([fill(K.clGood, vars), fill(K.clExact, vars), fill(K.clCountry, vars)], 0, [{ id: "sampleCountAsAll", at: 1, vars }, { id: "generalizeBeyond", at: 2 }],
            fill(K.whichClaim, vars), [`\\frac{${k}}{${n}} = ${p}\\%`]);
        }
      }
      if (t === "bias") {
        const names = [K.bVoluntary, K.bUnder, K.bNonresp, K.bNone];
        const whys = [K.whyVoluntary, K.whyUnder, K.whyNonresp];
        const k = r.int(0, 2);
        const right = names[k];
        const traps = [0, 1, 2, 3].filter((i) => i !== k).map((i): Slip => (i === 3
          ? { id: "biasMissed" as const, at: 3, vars: { why: whys[k], right } }
          : { id: "biasKindMixed" as const, at: i, vars: { got: names[i], why: whys[k], right } }));
        return pick(names, k, traps, fill(K.whichBias, { s: [K.sVoluntary, K.sUnder, K.sNonresp][k] }), [`\\text{${whys[k]}}`]);
      }
      const W2 = w.smp;
      const strat = r.next() < 0.5;
      const kinds = [W2.mSimple, W2.mStrat, W2.mCluster, W2.mSystem];
      const at = strat ? 1 : 2;
      const why = strat ? K.whyStrat : K.whyCluster;
      return pick(kinds, at, [{ id: "methodClusterStrata", at: strat ? 2 : 1 }, { id: "goalIgnored", at: 0, vars: { m: kinds[at], why } }],
        fill(K.whichGoal, { s: strat ? K.gStrat : K.gCluster }), [`\\text{${why}}`]);
    }
    const t = r.pick(["replace", "design", "flaw", "reach"] as const);
    if (t === "replace") {
      const a = r.int(3, 7);
      const b = r.int(2, 6);
      const n = a + b;
      const back = r.next() < 0.5;
      const [num, den] = back ? [a * a, n * n] : [a * (a - 1), n * (n - 1)];
      const vars = { a, n, a1: a - 1, n1: n - 1, v: back ? fp(a * (a - 1), n * (n - 1)) : fp(a * a, n * n) };
      return fracPart(fill(back ? K.withQ : K.withoutQ, { a, b }), num, den,
        [back ? tf("notReplacedForWith", (a * (a - 1)) / (n * (n - 1)), { ...vars, v: fp(a * a, n * n) }) : tf("replacedForNot", (a * a) / (n * n), { ...vars, v: fp(a * (a - 1), n * (n - 1)) })],
        [back ? `\\frac{${a}}{${n}} \\times \\frac{${a}}{${n}} = ${ft(a * a, n * n)}` : `\\frac{${a}}{${n}} \\times \\frac{${a - 1}}{${n - 1}} = ${ft(a * (a - 1), n * (n - 1))}`]);
    }
    if (t === "design") {
      const names = [K.dRandom, K.dBlock, K.dPairs];
      const whys = [K.whyRandom, K.whyBlock, K.whyPairs];
      const k = r.int(0, 2);
      return pick(names, k, [0, 1, 2].filter((i) => i !== k).map((i) => ({ id: "designMixed" as const, at: i, vars: { got: names[i], why: whys[k], right: names[k] } })),
        fill(K.whichDesign, { s: [K.sRandom, K.sBlock, K.sPairs][k] }), [`\\text{${whys[k]}}`]);
    }
    if (t === "flaw") {
      const names = [K.fBlind, K.fControl, K.fFew, K.fNone];
      const k = r.int(0, 2);
      return pick(names, k, [0, 1, 2, 3].filter((i) => i !== k).map((i): Slip => (i === 3
        ? { id: "flawMissed" as const, at: 3, vars: { right: names[k] } }
        : { id: "flawMixed" as const, at: i, vars: { got: names[i], right: names[k] } })),
        fill(K.whichFlaw, { s: [K.sBlind, K.sControl, K.sFew][k] }), [`\\text{${names[k]}}`]);
    }
    const [q, good, beyond, only] = r.pick([[K.rBike, K.rBikeGood, K.rBikeBeyond, K.rBikeOnly], [K.rLunch, K.rLunchGood, K.rLunchBeyond, K.rLunchOnly]] as const);
    return pick([good, beyond, only], 0, [{ id: "generalizeBeyond", at: 1 }, { id: "onlyThoseAsked", at: 2, vars: { pop: good } }], q, [`\\text{${K.reachStep}}`]);
  };
  if (r.int(0, 9) >= 5) return more();

  if (L === 1) {
    const t = r.pick(["pop", "fair", "question"] as const);
    if (t === "pop") {
      const [setting, everyone, asked, other] = r.pick([
        [W.popTown, W.popTownAll, W.popTownAsked, W.popTownOther],
        [W.popFactory, W.popFactoryAll, W.popFactoryAsked, W.popFactoryOther],
      ] as const);
      const sample = r.next() < 0.5;
      return pick([everyone, asked, other], sample ? 1 : 0, [{ id: "sampleAsPopulation", at: sample ? 0 : 1 }],
        `${setting} ${sample ? W.whichSample : W.whichPopulation}`, [`\\text{${fill(W.popStep, { all: everyone, some: asked })}}`]);
    }
    if (t === "fair") {
      const [q, good, ...bad] = r.pick([
        [W.fairSport, W.fairSportGood, W.fairSportTeam, W.fairSportGym],
        [W.fairRead, W.fairReadGood, W.fairReadLibrary, W.fairReadClub],
      ] as const);
      const k = r.int(1, 2);
      return pick([good, bad[0], bad[1]], 0, [{ id: "convenienceFair", at: k, vars: { s: bad[k - 1] } }], q, [`\\text{${W.fairStep}}`]);
    }
    const [good, leading] = r.pick([[W.qHomeworkFair, W.qHomeworkLeading], [W.qParkFair, W.qParkLeading], [W.qFoodFair, W.qFoodLeading]] as const);
    return pick([good, leading], 0, [{ id: "leadingNeutral", at: 1 }], W.whichQuestion, [`\\text{${W.questionStep}}`]);
  }

  if (L === 2) {
    if (r.next() < 0.5) {
      for (;;) {
        const N = r.pick([200, 300, 400, 500, 600, 800, 1000, 1200]);
        const n = r.pick([20, 25, 40, 50]);
        const k = r.int(2, n / 2);
        const v = (N * k) / n;
        const pct = (100 * k) / n;
        if (!Number.isInteger(v) || pct === v) continue;
        const prompt = fill(r.next() < 0.5 ? W.estFish : W.estSchool, { N, n, k });
        return {
          prompt, q: "",
          answer: { ...num(v), traps: [{ id: "estimateSampleCount", a: num(k), vars: { k, n, N, v } }, { id: "estimateAsPercent", a: num(pct), vars: { p: pct, N, v } }] },
          show: String(v), plain: String(v), format: "number",
          steps: [`\\frac{${k}}{${n}} \\times ${N} = ${v}`],
        };
      }
    }
    const kinds = [W.mSimple, W.mStrat, W.mCluster, W.mSystem];
    const t = r.int(0, 3);
    const how = [W.hSimple, W.hStrat, W.hCluster, W.hSystem][t];
    const traps = t === 1 ? [{ id: "methodClusterStrata" as const, at: 2 }] : t === 2 ? [{ id: "methodClusterStrata" as const, at: 1 }] : t === 3 ? [{ id: "methodSystematicRandom" as const, at: 0 }] : [];
    return pick(kinds, t, traps, fill(W.whichMethod, { how }), [`\\text{${fill(W.methodStep, { m: kinds[t] })}}`]);
  }

  const t = r.pick(["kind", "plan", "conclude"] as const);
  if (t === "kind") {
    const [obs, exp] = r.pick([[W.kCoffeeObs, W.kCoffeeExp], [W.kMusicObs, W.kMusicExp]] as const);
    const isExp = r.next() < 0.5;
    return pick([W.observational, W.experiment], isExp ? 1 : 0, [{ id: "studyKindMixed", at: isExp ? 0 : 1 }],
      fill(W.whichKind, { s: isExp ? exp : obs }), [`\\text{${isExp ? W.expStep : W.obsStep}}`]);
  }
  if (t === "plan") {
    const [q, coin, choose, all] = r.pick([[W.pApp, W.pAppCoin, W.pAppChoose, W.pAppAll], [W.pPlant, W.pPlantCoin, W.pPlantChoose, W.pPlantAll]] as const);
    return pick([coin, choose, all], 0, [{ id: "volunteerGroups", at: 1 }, { id: "noControl", at: 2 }], q, [`\\text{${W.planStep}}`]);
  }
  // A new setting: what the study found, and how far it reaches.
  const [q, ok, cause, beyond] = r.pick([
    [W.cDog, W.cDogOk, W.cDogCause, W.cDogBeyond],
    [W.cBreakfast, W.cBreakfastOk, W.cBreakfastCause, W.cBreakfastBeyond],
  ] as const);
  return pick([ok, cause, beyond], 0, [{ id: "causeFromObservation", at: 1 }, { id: "generalizeBeyond", at: 2 }], q, [`\\text{${W.concludeStep}}`]);
};

export default gen;
