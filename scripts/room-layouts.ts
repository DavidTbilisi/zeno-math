// The stored room layout of every roadmap (#584, roomLayout.ts): each goal laid out again over the layout stored in
// src/model/roomLayouts.ts, so places already given stay and new items take the next free ones. `npm run room-layouts`
// says which rooms would change; `npm run room-layouts -- --write` saves the layout, which tests/roomLayout.test.ts
// checks is up to date.
import { writeFileSync } from "node:fs";
import { GOALS } from "../src/model/roadmap.ts";
import { ROADMAPS } from "../src/model/roadmaps/index.ts";
import { layOut } from "../src/model/roomLayout.ts";
import { ROOM_LAYOUTS } from "../src/model/roomLayouts.ts";

export const ROOM_FILE = new URL("../src/model/roomLayouts.ts", import.meta.url);

export const roomLayouts = () => Object.fromEntries(GOALS.map((g) => [g, layOut(ROADMAPS[g], ROOM_LAYOUTS[g])]));

/** The file's text: one room to a line. */
export function roomFile(layouts: ReturnType<typeof roomLayouts>): string {
  const goals = Object.entries(layouts).map(([g, rooms]) =>
    `  ${g}: {\n${Object.entries(rooms).map(([id, places]) => `    ${JSON.stringify(id)}: ${JSON.stringify(places)},`).join("\n")}\n  },`);
  return [
    "// Written by `npm run room-layouts -- --write` (scripts/room-layouts.ts); see roomLayout.ts. Do not edit by hand.",
    'import type { GoalId } from "./roadmap.ts";',
    'import type { GoalRooms } from "./roomLayout.ts";',
    "",
    "export const ROOM_LAYOUTS: Readonly<Partial<Record<GoalId, GoalRooms>>> = {",
    ...goals,
    "};",
    "",
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const now = roomLayouts();
  const changed = GOALS.flatMap((g) => Object.keys(now[g]).filter((id) => JSON.stringify(now[g][id]) !== JSON.stringify(ROOM_LAYOUTS[g]?.[id])).map((id) => `${g}/${id}`));
  console.log(changed.length ? `Rooms that change: ${changed.join(", ")}` : "Every room is up to date.");
  if (process.argv.includes("--write")) {
    writeFileSync(ROOM_FILE, roomFile(now));
    console.log("Written to src/model/roomLayouts.ts.");
  }
}
