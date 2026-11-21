// Data science and machine learning: the course map (course.ts), unchanged, as a roadmap.
import { STAGES } from "../course.ts";
import { skills, type Roadmap } from "../roadmap.ts";

export const ML: Roadmap = { id: "ml", order: "grade", stages: STAGES.map((s) => ({ id: s.id, items: skills(...s.skills) })) };
