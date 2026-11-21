// Topic intros (#450): what a topic is, one picture, and where it turns up in everyday life, at the top of its topic page
// and on the "What is…?" page. The words are in the site locales (t.site.explain.topics); here are the small pictures
// beside the four everyday uses, in the same order, and the live piece the topic page puts first under "Try it". The
// big picture is TopicPicture.tsx. Reading one ticks a "What is…?" item on the hand-made roadmaps (roadmap.ts).
import type { LiveKind } from "../math/live.ts";
import type { TopicId } from "./topics.ts";

export type Explainer = { uses: readonly [string, string, string, string]; try: LiveKind };

export const EXPLAINERS: Readonly<Record<TopicId, Explainer>> = {
  numbers: { uses: ["🛒", "⏰", "📏", "⚽"], try: "numberLine" },
  fractions: { uses: ["🍕", "🏷️", "🥛", "🔋"], try: "fractionWall" },
  geometry: { uses: ["🗺️", "🛋️", "♿", "🎮"], try: "geoLab" },
  algebra: { uses: ["📱", "🧮", "🎯", "💻"], try: "balance" },
  functions: { uses: ["🌡️", "🚗", "📈", "🏀"], try: "machine" },
  trigonometry: { uses: ["🏔️", "🧭", "🎵", "🌉"], try: "trigBuild" },
  probability: { uses: ["🌦️", "🎲", "🛡️", "🩺"], try: "spinner" },
  statistics: { uses: ["🗳️", "🏆", "💊", "📰"], try: "barChart" },
  numberTheory: { uses: ["🔒", "🕐", "🧾", "📅"], try: "hundred" },
  finance: { uses: ["🏦", "🏠", "💳", "📈"], try: "coin" },
  logic: { uses: ["💻", "⚖️", "🧩", "🔍"], try: "oneStroke" },
  discrete: { uses: ["🗺️", "🌐", "📅", "🔑"], try: "connectTowns" },
  algorithms: { uses: ["🔎", "🎵", "📦", "📱"], try: "beSort" },
  vectors: { uses: ["🎮", "✈️", "🖼️", "🤖"], try: "plotPoint" },
  calculus: { uses: ["🚗", "🚀", "💉", "🌍"], try: "slopeLine" },
  analysis: { uses: ["½", "🧮", "📐", "🔊"], try: "fractionWall" },
  abstract: { uses: ["🧊", "🔐", "📱", "⚛️"], try: "rubik" },
  optimisation: { uses: ["🚚", "✈️", "🤖", "🏭"], try: "descentLab" },
  topology: { uses: ["🚇", "🧬", "🌐", "🤖"], try: "cubeNet" },
  ai: { uses: ["🗣️", "📷", "🎬", "🚗"], try: "knnLab" },
};
