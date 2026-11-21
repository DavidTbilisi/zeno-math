// The words for a roadmap's parts, shared by the roadmaps, the home page and the topic pages: a game's name, an item's
// (a "What is…?" item is named by its question), a stage's.
import { gradeName } from "./components/GradeCard";
import type { Dict } from "./locales/en";
import type { Grade } from "./model/curriculum";
import { isRead, isSkill, type GameId, type GoalId, type Item, type RoadStage } from "./model/roadmap";

export const gameName = (t: Dict, g: GameId) => (t.shapes.names as Record<string, string>)[`live${g[0].toUpperCase()}${g.slice(1)}`] ?? g;
export const itemName = (t: Dict, i: Item) =>
  isSkill(i) ? t.pracWords.skills[i.skill] : isRead(i) ? t.site.explain.topics[i.read].q : gameName(t, i.game);
export function stageName(t: Dict, lang: string, goal: GoalId, st: RoadStage) {
  if (goal === "ml") return t.course.stages[st.id as keyof Dict["course"]["stages"]];
  if (goal === "school") {
    const g = gradeName(Number(st.id) as Grade, t.pracWords.grades);
    // Georgian has no capitals in running text (upper-casing it gives Mtavruli).
    return lang === "ka" ? g : g[0].toLocaleUpperCase(lang) + g.slice(1);
  }
  return (t.roadmap.stages as Record<string, Record<string, string>>)[goal][st.id];
}
