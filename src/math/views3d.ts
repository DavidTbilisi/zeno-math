import { rng } from "./random";

/** Solid stacks on a 3 × 3 floor. Row zero is the back; front looks towards decreasing row. */
export type ViewsDifficulty = "easy" | "medium" | "hard";
export type LiveViews3d = { difficulty?: ViewsDifficulty; stage: number; seed?: number; heights: number[]; history: number[][]; checked: boolean; revealed: boolean };
export const VIEW_PUZZLES = [
  [0,0,0, 0,1,0, 1,1,0],
  [0,0,0, 1,2,0, 1,1,0],
  [1,1,1, 1,0,0, 1,0,0],
  [3,3,3, 2,2,2, 1,1,1],
  [1,2,3, 1,2,0, 1,0,0],
  [3,3,3, 3,0,1, 3,1,1],
  [3,2,1, 2,1,2, 1,2,3],
  [2,3,2, 1,0,1, 3,1,2],
];
/** Keep the introductory puzzles stable for saved boards, then grow connected footprints.
 * The seed and puzzle number fully determine a target, including after a board is reopened.
 * Bounded frontier growth always terminates and never creates disconnected floating stacks. */
export function viewsPuzzle(stage: number, seed = 1, difficulty?: ViewsDifficulty): number[] {
  const index = Math.max(0, Math.floor(stage));
  if (!difficulty && index < VIEW_PUZZLES.length) return [...VIEW_PUZZLES[index]];
  const random = rng((Math.imul(index + 1, 0x9e3779b1) ^ seed ^ (difficulty === "easy" ? 0x13579 : difficulty === "medium" ? 0x24680 : difficulty === "hard" ? 0x35791 : 0)) >>> 0);
  const hard = difficulty ? difficulty === "hard" : index >= 16;
  const size = difficulty === "easy" ? 3 + Math.floor(random()*2)
    : difficulty === "medium" ? 4 + Math.floor(random()*3)
    : difficulty === "hard" ? 7 + Math.floor(random()*3)
    : (hard ? 5 : 4) + Math.floor(random() * (hard ? 5 : 4));
  const maxHeight = difficulty === "easy" ? 1 : hard ? 3 : 2;
  const heights = Array<number>(9).fill(0);
  const start = Math.floor(random() * 9);
  heights[start] = 1 + Math.floor(random() * maxHeight);
  for (let count = 1; count < size; count++) {
    const frontier = heights.flatMap((h,i) => {
      if (h) return [];
      const x=i%3,y=Math.floor(i/3);
      return ((x>0 && heights[i-1]>0) || (x<2 && heights[i+1]>0) || (y>0 && heights[i-3]>0) || (y<2 && heights[i+3]>0)) ? [i] : [];
    });
    heights[frontier[Math.floor(random()*frontier.length)]] = 1 + Math.floor(random() * maxHeight);
  }
  // Always include a height change, even if random heights happened to agree.
  const occupied = heights.flatMap((h,i)=>h ? [i] : []);
  if (maxHeight > 1 && occupied.every(i=>heights[i]===heights[occupied[0]])) {
    const i=occupied[Math.floor(random()*occupied.length)];
    heights[i]=heights[i]===1 ? maxHeight : 1;
  }
  if (difficulty === "hard") heights[occupied[0]]=3;
  return heights;
}

export type View = 'top' | 'front' | 'side';
/** Depth of the nearest occupied face per projected cell, or -1 for empty. Equal adjacent depths
 * form a continuous face; different depths create a visible step edge. Side is viewed from +x,
 * with the front at the left of the drawing. */
export function project(heights: number[], view: View): number[] {
  return Array.from({ length: 9 }, (_, i) => {
    const u = i % 3, v = Math.floor(i / 3), z = 2 - v;
    if (view === 'top') return heights[i] ? heights[i] : -1;
    if (view === 'front') {
      for (let y = 2; y >= 0; y--) if (heights[y * 3 + u] > z) return y;
    } else {
      const y = 2 - u;
      for (let x = 2; x >= 0; x--) if (heights[y * 3 + x] > z) return x;
    }
    return -1;
  });
}
export function viewEdges(depths: number[]): string[] {
  const edges = new Set<string>();
  depths.forEach((d, i) => {
    if (d < 0) return;
    const x = i % 3, y = Math.floor(i / 3);
    if (y === 0 || depths[i - 3] !== d) edges.add(`${x},${y},${x+1},${y}`);
    if (y === 2 || depths[i + 3] !== d) edges.add(`${x},${y+1},${x+1},${y+1}`);
    if (x === 0 || depths[i - 1] !== d) edges.add(`${x},${y},${x},${y+1}`);
    if (x === 2 || depths[i + 1] !== d) edges.add(`${x+1},${y},${x+1},${y+1}`);
  });
  return [...edges].sort();
}
export function viewMatches(a: number[], b: number[], view: View): boolean {
  const p = project(a, view), q = project(b, view);
  return p.every((d, i) => (d >= 0) === (q[i] >= 0)) && viewEdges(p).join(';') === viewEdges(q).join(';');
}
export const solidMatches = (a: number[], b: number[]) => (['top','front','side'] as View[]).every(v => viewMatches(a,b,v));

/** Camera-only quarter turns around the centre of the floor; puzzle coordinates stay fixed. */
export function rotateViewPoint(x: number, y: number, turns: number): [number, number] {
  if (!Number.isInteger(turns)) {
    const angle = turns * Math.PI / 2, c = Math.cos(angle), s = Math.sin(angle);
    return [1.5 + (x - 1.5) * c - (y - 1.5) * s, 1.5 + (x - 1.5) * s + (y - 1.5) * c];
  }
  switch (((turns % 4) + 4) % 4) {
    case 1: return [3 - y, x];
    case 2: return [3 - x, 3 - y];
    case 3: return [y, 3 - x];
    default: return [x, y];
  }
}

/** Orthographic camera: yaw around the floor, elevation about the horizontal axis, roll about
 * the viewing axis. The third coordinate is depth, increasing towards the viewer. */
export function cameraPoint(x: number, y: number, z: number, yaw: number, elevation: number, roll: number): [number, number, number] {
  const [rx, ry] = rotateViewPoint(x, y, yaw);
  const e = elevation * Math.PI / 180, r = roll * Math.PI / 180;
  const horizontal = (rx - ry) / Math.SQRT2;
  const forward = (rx + ry - 3) / Math.SQRT2;
  const vertical = forward * Math.sin(e) - (z - 1.5) * Math.cos(e);
  return [horizontal * Math.cos(r) - vertical * Math.sin(r), horizontal * Math.sin(r) + vertical * Math.cos(r), forward * Math.cos(e) + (z - 1.5) * Math.sin(e)];
}
