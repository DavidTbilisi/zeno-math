// Practice: sequential games solved backwards. Easy: player 1 moves, then player 2 sees the move and replies; a
// player's payoff in the subgame-perfect equilibrium (the other player taken to help, or to hurt, named). Medium:
// the same with player 1 moving again after one reply. Hard: the Stackelberg duopoly with price a − Q and unit cost c,
// the leader's output, the follower's or the price (the Cournot answer, the follower's reaction not halved, named).
import { exact } from "../calculusTwo";
import { F, helping, hostile, leaves, selfish, solve, strict, type Tree } from "../gameTheory";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const pay = (r: Rng): Tree => ({ pay: [r.int(0, 9), r.int(0, 9)] });
/** Player 1 picks L or R, player 2 replies a or b after L and c or d after R; with deep, player 1 picks x or y after L, a. */
const drawTree = (r: Rng, deep: boolean): Tree => ({
  who: 0,
  moves: [
    ["L", { who: 1, moves: [["a", deep ? { who: 0, moves: [["x", pay(r)], ["y", pay(r)]] } : pay(r)], ["b", pay(r)]] }],
    ["R", { who: 1, moves: [["c", pay(r)], ["d", pay(r)]] }],
  ],
});
const treeTex = (t: Tree) =>
  `\\begin{array}{l|c} ${leaves(t)
    .map(([path, [u, v]]) => `${path.join(" \\to ")} & (${u}, ${v})`)
    .join(" \\\\ ")} \\end{array}`;

function treePart(r: Rng, w: PracticeWords, deep: boolean): Part {
  for (;;) {
    const t = drawTree(r, deep);
    if (!strict(t)) continue;
    const p = r.pick([0, 1] as const);
    const log: { path: string[]; move: string; outcomes: [number, number][]; who: 0 | 1 }[] = [];
    const end = solve(t, selfish, log);
    return {
      prompt: fill(w.gt.prompt.tree, { i: p + 1 }),
      q: treeTex(t),
      ...exact(F(end[p]), [["opponentHelps", solve(t, helping(p))[p]], ["opponentHostile", solve(t, hostile(p))[p]]]),
      steps: [
        ...log.map(({ path, move, outcomes, who }) => {
          const own = outcomes.map((o) => o[who]);
          return `${path.length ? `${path.join(", ")}: \\ ` : ""}P_{${who + 1}}: \\max(${own.join(", ")}) = ${Math.max(...own)} \\implies ${move}`;
        }),
        `(${end[0]}, ${end[1]})`,
      ],
    };
  }
}

function stackelbergPart(r: Rng, w: PracticeWords): Part {
  const k = r.pick([12, 24, 36]);
  const c = r.int(1, 10);
  const a = c + k;
  const lead = k / 2;
  const follow = k / 4;
  const price = a - lead - follow;
  const kind = r.pick(["leader", "follower", "price"] as const);
  const steps = [
    `q_{2} = \\frac{${a} - ${c} - q_{1}}{2} = \\frac{${k} - q_{1}}{2}`,
    `\\pi_{1} = (${a} - q_{1} - q_{2} - ${c}) q_{1} = \\frac{(${k} - q_{1}) q_{1}}{2} \\implies q_{1} = ${lead}`,
  ];
  const q = `P = ${a} - Q, \\quad c = ${c}`;
  if (kind === "leader")
    return { prompt: w.gt.prompt.stackLeader, q, ...exact(F(lead), [["cournotForStackelberg", F(k, 3)]]), steps };
  if (kind === "follower")
    return {
      prompt: w.gt.prompt.stackFollower,
      q,
      ...exact(F(follow), [["cournotForStackelberg", F(k, 3)], ["reactionNotHalved", F(k - lead)]]),
      steps: [...steps, `q_{2} = \\frac{${k} - ${lead}}{2} = ${follow}`],
    };
  return {
    prompt: w.gt.prompt.stackPrice,
    q,
    ...exact(F(price), [["cournotForStackelberg", F(a).sub(F(2 * k, 3))], ["reactionNotHalved", F(c)]]),
    steps: [...steps, `q_{2} = \\frac{${k} - ${lead}}{2} = ${follow}`, `P = ${a} - ${lead} - ${follow} = ${price}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return treePart(r, w, false);
  if (L === 2) return treePart(r, w, true);
  return stackelbergPart(r, w);
};

export default gen;
