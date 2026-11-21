// Every roadmap, one file each, in the order the goals are offered.
import type { GoalId, Roadmap } from "../roadmap.ts";
import { ALGORITHMS } from "./algorithms.ts";
import { BANKING } from "./banking.ts";
import { FINANCE } from "./finance.ts";
import { ML } from "./ml.ts";
import { SCHOOL } from "./school.ts";
import { SOFTWARE } from "./software.ts";

export const ROADMAPS: Readonly<Record<GoalId, Roadmap>> = { software: SOFTWARE, algorithms: ALGORITHMS, finance: FINANCE, banking: BANKING, ml: ML, school: SCHOOL };
