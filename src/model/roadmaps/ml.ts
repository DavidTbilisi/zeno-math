// Data science and machine learning: the course map (course.ts), unchanged, as a roadmap, and each stage's labs to try
// (#461) after its skills.
import { STAGES } from "../course.ts";
import { labs, skills, type LabId, type Roadmap } from "../roadmap.ts";

const STAGE_LABS: Partial<Record<string, LabId[]>> = {
  linear: ["tensorLab", "pcaLab", "embedLab"],
  probability: ["softmaxLab", "rocLab"],
  optimisation: ["descentLab", "batchLab", "fitLab"],
  classical: ["knnLab", "treeLab", "kmeansLab"],
  deep: ["nnLab", "backpropLab", "convLab", "rnnLab", "attnLab", "rlLab"],
};

export const ML: Roadmap = {
  id: "ml",
  order: "grade",
  stages: STAGES.map((s) => ({ id: s.id, items: [...skills(...s.skills), ...labs(...(STAGE_LABS[s.id] ?? []))] })),
};
