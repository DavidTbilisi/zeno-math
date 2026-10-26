// Solves cubes away from the page, so the board does not stop while the tables are made and the turns searched for.
// Asked with no cube, it only makes the tables, ready for the cube being painted.
import { movesText } from "../math/rubik";
import { type Cubies, solve, SOLVED } from "../math/rubikSolve";

const self_ = self as unknown as { onmessage: (e: MessageEvent<{ id: number; cubies: Cubies | null }>) => void; postMessage: (m: unknown) => void };
self_.onmessage = ({ data: { id, cubies } }) => self_.postMessage({ id, moves: movesText(solve(cubies ?? SOLVED)) });
