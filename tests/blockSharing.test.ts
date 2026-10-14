// Sharing base-ten blocks into groups, the hands-on long division: a pupil who follows the hints ends with the
// quotient in every group and the remainder in the pool, nothing is made or lost on the way, and the groups are read
// back as the steps of the written division.
import { test } from "node:test";
import assert from "node:assert/strict";
import { planDivision } from "../src/math/division.ts";
import { countsValue, dealTo, moveBlock, shareStatus, sharingAt, stepsShared, tradeBlock, type Sharing } from "../src/math/sharing.ts";

const total = (s: Sharing) => countsValue(s.pool) + s.groups.reduce((t, g) => t + countsValue(g), 0);

test("following the hints shares out every division the blocks allow, and the working follows", () => {
  for (let b = 1; b <= 9; b++)
    for (let a = 0; a <= 999; a++) {
      const plan = planDivision(a, b, 0);
      let s = sharingAt(plan, b, 0);
      for (let moves = 0; ; moves++) {
        assert.ok(moves < 2000, `${a} ÷ ${b} never ends`);
        assert.equal(total(s), a, `${a} ÷ ${b}: blocks made or lost`);
        const st = shareStatus(s);
        if (st.kind === "done") {
          assert.equal(st.each, Math.floor(a / b), `${a} ÷ ${b}`);
          assert.equal(st.left, a % b, `${a} ÷ ${b}`);
          assert.equal(stepsShared(plan, b, s), plan.steps.length, `${a} ÷ ${b}: the working is complete`);
          break;
        }
        if (st.kind === "unfair") assert.fail(`${a} ÷ ${b}: dealing a round at a time keeps it fair`);
        if (st.kind === "trade") s = tradeBlock(s, st.place)!;
        else for (let i = 0; i < b; i++) s = moveBlock(s, st.place, "pool", dealTo(s, st.place))!;
      }
    }
});

test("each step of the written division is an arrangement of the blocks, read back as that step", () => {
  for (const [a, b] of [[405, 3], [125, 3], [306, 3], [999, 9], [7, 8], [624, 4]]) {
    const plan = planDivision(a, b, 0);
    for (let k = 0; k <= plan.steps.length; k++) {
      const s = sharingAt(plan, b, k);
      assert.equal(total(s), a);
      // A step whose quotient digit is 0 gives nothing out, so it reads as far as the next real share.
      const read = stepsShared(plan, b, s);
      assert.ok(read >= k && plan.steps.slice(k, read).every((st) => st.q === 0), `${a} ÷ ${b} step ${k} read as ${read}`);
    }
  }
});

test("moves that can't be made are refused, and a tap deals to the group with fewest", () => {
  const s = sharingAt(planDivision(42, 3, 0), 3, 0);
  assert.equal(moveBlock(s, "h", "pool", 0), null, "no hundreds in 42");
  assert.equal(moveBlock(s, "t", 0, "pool"), null, "the group has none to give back");
  assert.equal(moveBlock(s, "t", "pool", "pool"), null);
  assert.equal(tradeBlock(s, "o"), null, "a one can't be broken up");
  const one = moveBlock(s, "t", "pool", 0)!;
  assert.equal(dealTo(one, "t"), 1);
  assert.equal(shareStatus(one).kind, "unfair");
  const back = moveBlock(one, "t", 0, "pool")!;
  assert.deepEqual(back, s);
  assert.deepEqual(tradeBlock(s, "t")!.pool, { h: 0, t: 3, o: 12 });
});
