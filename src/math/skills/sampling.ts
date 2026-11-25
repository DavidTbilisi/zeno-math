// Practice: samples and study design (#653). Easy: the population or the sample, a fair sample, a fair question. Medium:
// an estimate for the population from a random sample, and the name of a way of sampling. Hard: an observational study
// or an experiment, a plan that can show a cause, and, in a new setting, which conclusion a study allows. The sample
// taken for the population, a handy sample taken for fair, a leading question taken for fair, the sample's count or
// percentage given for the estimate, cluster and stratified swapped, every tenth taken for simple random, the kind of
// study mixed up, groups that choose themselves or no group to compare, a cause read from an observation and a sample
// stretched to people it never reached are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const W = w.smp;
  /** A pick from options in a shuffled order; `right` and each slip's `at` index the options as given. */
  const pick = (options: string[], right: number, traps: { id: Trap["id"]; at: number; vars?: Record<string, string | number> }[], prompt: string, steps: string[]): Part => {
    const order = options.map((_, i) => i).sort(() => r.next() - 0.5);
    const opts = order.map((i) => ({ text: options[i], plain: options[i], tex: `\\text{${options[i]}}` }));
    const at = (i: number) => order.indexOf(i);
    return {
      prompt, q: "",
      answer: { k: "pick", options: opts, right: at(right), traps: traps.map((t) => ({ id: t.id, a: { k: "pick", options: opts, right: at(t.at) }, vars: t.vars })) },
      show: opts[at(right)].tex, plain: options[right], format: "pick", steps,
    };
  };

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
