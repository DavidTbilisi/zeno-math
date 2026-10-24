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

export const problems: typeof En = {
  problem: "ამოცანა",
  category: "კატეგორია",
  example: "მაგალითი",
  quiz: "შენი სვლა",
  quizTip: "ყოველი ნაბიჯის წინ თქვი, რა მოხდება",
  play: "გაშვება",
  pause: "პაუზა",
  first: "დასაწყისში",
  prev: "ნაბიჯით უკან",
  next: "ნაბიჯით წინ",
  last: "პასუხამდე",
  step: "ნაბიჯი {k} / {n}",
  right: "სწორია!",
  wrong: "ეს არა. კიდევ ერთხელ დახედე.",
  hint: "აკრიფე ახალი მონაცემები და დააჭირე Enter-ს: ნაბიჯები თავიდან დაიწყება.",
  levels: ["მარტივი", "საშუალო", "რთული", "ძალიან რთული"],
  cats: {
    arrays: "მასივები", bst: "ორობითი ძებნის ხეები", trees: "ორობითი ხეები", dp: "დინამიკური პროგრამირება", famous: "ცნობილი ალგორითმები",
    graphs: "გრაფები", greedy: "ხარბი ალგორითმები", heaps: "გროვები", lists: "ბმული სიები", recursion: "რეკურსია",
    searching: "ძებნა", sorting: "დალაგება", stacks: "სტეკები", strings: "სტრიქონები", tries: "პრეფიქსული ხეები",
  },
  yes: "კი",
  no: "არა",
  errors: {
    empty: "ჯერ აქ რამე დაწერე.",
    number: "„{s}“ რიცხვი არ არის.",
    whole: "„{s}“ მთელი რიცხვი არ არის.",
    atLeast: "„{s}“ ძალიან პატარაა: სულ მცირე {n}.",
    atMost: "„{s}“ ძალიან დიდია: არაუმეტეს {n}.",
    range: "დაწერე მთელი რიცხვი {lo}-დან {hi}-მდე და არა „{s}“.",
    tooMany: "არაუმეტეს {n}, რომ დაეტიოს.",
    tooFew: "სულ მცირე {n}.",
    tooLong: "არაუმეტეს {n} სიმბოლოსი, რომ დაეტიოს.",
    gridSize: "არაუმეტეს {r} სტრიქონისა და {c} სვეტისა, რომ დაეტიოს.",
    ragged: "ყოველ სტრიქონში იმდენივე ელემენტი უნდა იყოს, რამდენიც პირველში.",
    interval: "„{s}“ ინტერვალი არ არის: დაწერე [დასაწყისი, ბოლო], დასაწყისი ≤ ბოლო.",
    point: "„{s}“ წერტილი არ არის: დაწერე x, y მთელი რიცხვებით.",
    edge: "„{s}“ წიბო არ არის: დაწერე A-B (ან A>B ერთი მიმართულებით), საჭიროების შემთხვევაში წონით ბოლოში.",
    tooManyNodes: "არაუმეტეს {n} წვეროსი, რომ გრაფი დაეტიოს.",
    deep: "არაუმეტეს {n} დონისა, რომ ხე დაეტიოს.",
    sameLength: "ორივეში ელემენტების ერთნაირი რაოდენობა უნდა იყოს.",
    bad: "„{s}“ აქ არ ჯდება.",
  },
  arrays, bst, trees, dp, famous, graphs, greedy, heaps, lists, recursion, searching, sorting, stacks, strings, tries,
};
