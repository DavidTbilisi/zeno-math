// The learner's book of number facts (math/facts.ts) as this browser keeps it: one book for every fact game, so a
// fact missed in one comes up in the others. Its key follows a signed-in account like a game's ladder
// (model/accountState.ts, which also says how two devices' books become one).
import { readBook, type FactBook } from "../math/facts";
import { FACTS_KEY } from "../model/accountState";

export function loadBook(): FactBook {
  try {
    return readBook(localStorage.getItem(FACTS_KEY));
  } catch {
    return {};
  }
}
export function keepBook(book: FactBook) {
  try {
    localStorage.setItem(FACTS_KEY, JSON.stringify(book));
  } catch {
    // private mode: the book lasts until the page closes
  }
}
