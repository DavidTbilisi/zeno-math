// Practice: Graph stories.
import { fill, r2 } from "../chart";
import { LETTERS } from "../cubeNets";
import { storyChoicesSvg, storyOptions, storyQuestion, storyWords } from "../graphStory";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Which of four graphs is a walk's, the distance from home against the time (src/math/graphStory.ts); a letter,
  // typed or picked.
  const q = storyQuestion(L, r.next);
  const options = storyOptions();
  const pic = storyChoicesSvg(q);
  return {
    prompt: fill(w.prompts.graphStory, { story: storyWords(q.task.parts).map((p) => w.story.parts[p]).join(w.story.then) }),
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { k: "pick", options, right: q.right, traps: q.traps.map(({ id, at }) => ({ id, a: { k: "pick", options, right: at }, vars: { x: LETTERS[at] } })) },
    show: `\\text{${LETTERS[q.right]}}`,
    plain: LETTERS[q.right],
    format: "pick",
    solution: { kind: "story", spec: { task: q.task, steps: [] } },
  };
};

export default gen;
