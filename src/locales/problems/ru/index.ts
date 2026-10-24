// The interview problems' words: the piece's own, the categories and levels, the errors the inputs can give, then
// each category's problems from a file of its own.
import type { problems as En } from "../en/index";
import { arrays } from "./arrays";
import { bst } from "./bst";
import { trees } from "./trees";
import { dp } from "./dp";
import { famous } from "./famous";
import { graphs } from "./graphs";
import { greedy } from "./greedy";
import { heaps } from "./heaps";
import { lists } from "./lists";
import { recursion } from "./recursion";
import { searching } from "./searching";
import { sorting } from "./sorting";
import { stacks } from "./stacks";
import { strings } from "./strings";
import { tries } from "./tries";
import { sysBasics } from "./sysBasics";
import { sysDesigns } from "./sysDesigns";

export const problems: typeof En = {
  problem: "Задача",
  category: "Раздел",
  example: "Пример",
  quiz: "Твой ход",
  quizTip: "Перед каждым шагом скажи, что будет дальше",
  play: "Пуск",
  pause: "Пауза",
  first: "В начало",
  prev: "Шаг назад",
  next: "Шаг вперёд",
  last: "К ответу",
  step: "Шаг {k} из {n}",
  right: "Верно!",
  wrong: "Не то. Посмотри ещё раз.",
  hint: "Впиши новые данные и нажми Enter: шаги начнутся сначала.",
  levels: ["лёгкая", "средняя", "трудная", "очень трудная"],
  cats: {
    arrays: "Массивы", bst: "Двоичные деревья поиска", trees: "Двоичные деревья", dp: "Динамическое программирование", famous: "Известные алгоритмы",
    graphs: "Графы", greedy: "Жадные алгоритмы", heaps: "Кучи", lists: "Связные списки", recursion: "Рекурсия",
    searching: "Поиск", sorting: "Сортировка", stacks: "Стеки", strings: "Строки", tries: "Префиксные деревья",
    sysBasics: "Проектирование систем: основы", sysDesigns: "Проектирование систем: задачи",
  },
  groups: { coding: "Задачи на программирование", systems: "Проектирование систем" },
  yes: "да",
  no: "нет",
  errors: {
    empty: "Сначала напиши здесь что-нибудь.",
    number: "«{s}» — не число.",
    whole: "«{s}» — не целое число.",
    atLeast: "«{s}» слишком мало: не меньше {n}.",
    atMost: "«{s}» слишком велико: не больше {n}.",
    range: "Напиши целое число от {lo} до {hi}, а не «{s}».",
    tooMany: "Не больше {n}, чтобы поместилось.",
    tooFew: "Хотя бы {n}.",
    tooLong: "Не больше {n} символов, чтобы поместилось.",
    gridSize: "Не больше {r} строк и {c} столбцов, чтобы поместилось.",
    ragged: "В каждой строке должно быть столько же элементов, сколько в первой.",
    interval: "«{s}» — не интервал: пиши [начало, конец], начало ≤ конец.",
    point: "«{s}» — не точка: пиши x, y целыми числами.",
    edge: "«{s}» — не ребро: пиши A-B (или A>B в одну сторону), с весом в конце, если он нужен.",
    tooManyNodes: "Не больше {n} вершин, чтобы граф поместился.",
    deep: "Не больше {n} уровней, чтобы дерево поместилось.",
    sameLength: "В обоих должно быть одинаковое число элементов.",
    bad: "«{s}» здесь не подходит.",
  },
  arrays, bst, trees, dp, famous, graphs, greedy, heaps, lists, recursion, searching, sorting, stacks, strings, tries, sysBasics, sysDesigns,
};
