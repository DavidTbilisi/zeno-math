// The goal a student's teacher picked for their class (#461), kept in this browser as it last came from the server, and
// the goal the site opens on: the learner's own choice once they've made one (achieved.ts), else their class's.
import { useEffect, useState } from "react";
import { storedGoal, storeGoal } from "./achieved";
import { classInfo } from "./classGames";
import { loadStudent } from "./learner";
import { isGoal, type GoalId } from "./model/roadmap";

const KEY = "zeno.classGoal";
export function classGoal(): GoalId | null {
  try {
    const g = localStorage.getItem(KEY);
    return isGoal(g) ? g : null;
  } catch {
    return null;
  }
}
/** Keeps what the server said (null: the class has no goal, or the student isn't in a class any more). */
export function storeClassGoal(g: unknown) {
  try {
    if (isGoal(g)) localStorage.setItem(KEY, g);
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: the class goal is just not kept */
  }
}

/**
 * Opening a roadmap makes it the learner's goal, except their class's goal while they haven't chosen one of their own:
 * following the teacher isn't a choice, so a goal the teacher changes later still reaches them.
 */
export function chooseGoal(g: GoalId) {
  if (storedGoal() || g !== classGoal()) storeGoal(g);
}

/**
 * The goal the site opens on and whether it is the class's: the learner's own, else their class's. A signed-in
 * student's class goal is asked for once per page, in case the teacher has changed it.
 */
export function useGoal(): { goal: GoalId | null; fromClass: boolean } {
  const [klass, setKlass] = useState(classGoal);
  useEffect(() => {
    if (!loadStudent()) return;
    let live = true;
    void classInfo().then((info) => {
      if (!info) return;
      storeClassGoal(info.goal);
      if (live) setKlass(classGoal());
    });
    return () => {
      live = false;
    };
  }, []);
  const own = storedGoal();
  return { goal: own ?? klass, fromClass: !own && !!klass };
}
