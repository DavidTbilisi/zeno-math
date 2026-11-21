// The library of the site (#448): every tool, live piece and game of the board's menus (menus.ts, still the one source
// of truth), in their order, each with its own page. Practice is left out: it has its own page, #/practice.
import type { Dict } from "./locales/en";
import type { LiveKind } from "./math/live";
import { SHAPES } from "./math/shapes";
import { isLiveEntry, MENUS, type LiveEntry, type MenuEntry, type MenuGroup, type MenuSection } from "./menus";
import { TOPICS, type Topic } from "./model/topics";
import type { Word } from "./tools";

export type LibKind = "tool" | "piece" | "game";
export type LibEntry = {
  /** Its page: #/library/<path>, which is also what a board opens (#/b/<id>/<path>). */
  path: string;
  kind: LibKind;
  icon: string;
  entry: MenuEntry | LiveEntry;
  group: MenuGroup;
  section: MenuSection;
};

export const LIBRARY: readonly LibEntry[] = MENUS.filter((g) => g.label !== "practice").flatMap((group) =>
  group.sections.flatMap((section) =>
    section.items.map((entry): LibEntry => ({
      path: isLiveEntry(entry) ? `live/${entry.live}` : `tool/${entry.kind}${entry.start ? `/${entry.start}` : ""}`,
      kind: isLiveEntry(entry) ? (group.label === "gamesMenu" ? "game" : "piece") : "tool",
      icon: entry.icon,
      entry,
      group,
      section,
    })),
  ),
);
export const libEntry = (path: string) => LIBRARY.find((e) => e.path === path);

const pieceId = (kind: LiveKind) => SHAPES.find((s) => s.live === kind)?.id as keyof Dict["shapes"]["names"] | undefined;
export function entryName(t: Dict, e: LibEntry): string {
  if (!isLiveEntry(e.entry)) return t[e.entry.label];
  const id = pieceId(e.entry.live);
  return id ? t.shapes.names[id] : e.entry.live;
}
export const sectionName = (t: Dict, s: MenuSection, g: MenuGroup) => t[s.title ?? g.title ?? g.label];

/** The topics a library entry belongs to: those that list its menu section. */
export const topicsOf = (e: LibEntry): Topic[] => (e.section.title ? TOPICS.filter((t) => t.sections.includes(e.section.title as Word)) : []);
/** A topic's library entries, tools first, then hands-on pieces, then games. */
export function entriesOf(topic: Topic): LibEntry[] {
  const mine = LIBRARY.filter((e) => e.section.title && topic.sections.includes(e.section.title));
  return (["tool", "piece", "game"] as const).flatMap((k) => mine.filter((e) => e.kind === k));
}

/** Folds case and accents so that a search finds "Säule" by "saule" and ignores capitals in every script. */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
/** The entries whose name, section or menu matches every word of the query. */
export function searchLibrary(t: Dict, q: string): LibEntry[] {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [...LIBRARY];
  return LIBRARY.filter((e) => {
    const hay = fold(`${entryName(t, e)} ${sectionName(t, e.section, e.group)} ${t[e.group.title ?? e.group.label]}`);
    return words.every((w) => hay.includes(w));
  });
}
