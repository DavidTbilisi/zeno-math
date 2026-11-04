import { useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { SpokenMath } from "./SpokenMath";
import { ApiError, study } from "../api";
import { useI18n } from "../i18n";
import {
  applyAttempt, attemptEvidence, classQuestion, fadedOf, finish, learnFromAttempt, localSlot, loadStudent, logAnswer, logStep, ME, Outbox, saveStudent, startLog, studentHas, toAttempt, toClassPlan, whatWasHard, withProtocol,
  type ClassPlan, type Origin, type QuestionLog, type Student, type TestAnswer,
} from "../learner";
import { newcomerChance } from "../model/logistic";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";
import { latexToSvg, type RenderedSvg } from "../math/latex";
import {
  ALL_SKILLS, AREAS, areaOf, check, exampleLike, exercise, LEVELS, preview, renderPractice, renderSteps, SKILLS, stepsOf, STEPS_AFTER_MISS, type Area, type Exercise, type Level, type PracticeSpec,
  type SkillId, type Verdict,
} from "../math/practice";
import { renderSolution } from "../math/practiceSolve";
import { svgToDataUrl } from "../math/svg";
import { Countdown } from "./Countdown";
import { AnswerField, PlayAnswer } from "./PlayAnswer";
import { setFeel, useFeel } from "../live/feel";
import { muted, play as playSound, setMuted } from "../live/juice";
import { Cheer } from "../live/ladderUi";
import { Modal } from "./Modal";
import { StudentPanel } from "./StudentPanel";
import { TestRunner } from "./TestRunner";
import { ChoicePicks, ListPicks, Segmented, SignPicks, startOr, Tabs, TargetPicks, TogglePicks } from "./ui";
import { WorkInSteps } from "./WorkInSteps";
import { ScratchPad } from "./ScratchPad";
import { BreakPrompt, ComingBack, SessionRing, SessionSummary, type SessionResult } from "./PracticeSession";
import { breakDue, keepLength, sessionLength, stretchAfter, type Length, type Stretch } from "../math/sessionPace";
import { RATINGS, rateLevel, type Rating } from "../model/difficulty";
import { addPiece, dropPiece } from "../math/target";
import { emptyProgress, loadProgress, saveProgress, type Progress } from "../practiceProgress";
import { gradeOf } from "../model/curriculum";
import { holds, learnSpacing, nextReview, openAgain, type Hold } from "../model/spacing";
import type { Feature } from "../model/arms";
import { homeworkIndex, nextHomework } from "../model/homework";
import { givenSteps, learnFading, type Fading } from "../model/fading";
import { keepClassLit, loadClassLit } from "../classIdeaMap";
import { lightUp, newlyLit, type LitMap } from "../model/ideaMap";
import { hasIdeas, SKILL_IDEAS, type IdeaState } from "../model/ideaState";
import { IdeaMap } from "./IdeaMap";
import {
  cellKey, cellsOf, currentGrade, isSecure, placedGrade, placementStep, probe, recordCell, startPlacement, type Cell, type Placement,
} from "../model/placement";
import { GradeCard, gradeName } from "./GradeCard";

type Mode = "practise" | "sheet";
/** A skill, a mix of the area's skills, the learner's grade, or the placement that finds it. */
type Pick = SkillId | "mixed" | "grade" | "place";

/** How much larger the page draws the question's maths and picture than their own size, to sit with its larger text. */
const MATH_SCALE = 1.4;
/** Questions answered before a missed one comes back. */
const REVIEW_AFTER = 3;
/** Right answers in a row that earn a celebration. */
const CHEER_AT = [3, 5, 10, 15, 20];

const newSeed = () => Math.floor(Math.random() * 2 ** 31);
const randomOf = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const areaLabel = (t: Dict, a: Area) =>
  ({ number: t.practiceNumber, algebra: t.practiceAlgebra, geometry: t.practiceGeometry, calculus: t.practiceCalculus, data: t.practiceData })[a];

type Current = { ex: Exercise } & Origin;
const freeOrigin: Origin = { policy: "free", review: false, predicted: null };

/** Finished questions of a student in a class study, on their way to the server. */
const outbox = new Outbox(localSlot("zeno.outbox.v1"), study.send);
/** Their test answers, the same way. */
const testOutbox = new Outbox<TestAnswer>(localSlot("zeno.testbox.v1"), study.sendTest);
/** Whether the student keeps scratch paper open under the questions, remembered on this device. */
const SCRATCH_KEY = "zeno.scratch.v1";
const scratchWanted = () => {
  try {
    return localStorage.getItem(SCRATCH_KEY) === "on";
  } catch {
    return false;
  }
};
const wantScratch = (on: boolean) => {
  try {
    if (on) localStorage.setItem(SCRATCH_KEY, "on");
    else localStorage.removeItem(SCRATCH_KEY);
  } catch {
    // Without storage the choice lasts until the page is left.
  }
};
const queued = () => outbox.items().length + testOutbox.items().length;
/** The faces on the difficulty buttons. */
const RATE_ICON: Record<Rating, string> = { easy: "😌", right: "👍", hard: "😓" };

/** How often the dialog asks whether the teacher has moved the class on (a new phase, a session starting). */
const PROTOCOL_POLL_MS = 30_000;
/** Test answers still waiting to be sent count as answered, so the test doesn't ask the same question twice. */
function markQueuedTests(plan: ClassPlan, studentCode: string) {
  for (const a of testOutbox.items())
    if (a.student === studentCode && !plan.tests[a.phase].answered.includes(a.item)) plan.tests[a.phase].answered.push(a.item);
}

/**
 * On a board it inserts onto the board, from a panel beside it (`docked`) or a dialog over it; without `onSubmit` it is
 * the practice page's body.
 */
type Props = { initial?: PracticeSpec; start?: string } & (
  | { onSubmit: (spec: PracticeSpec, rendered: RenderedSvg) => void; onClose: () => void; docked?: boolean }
  // The page; noClass where there is no server to join a class on (the copy published on GitHub Pages).
  | { onSubmit?: undefined; onClose?: undefined; docked?: undefined; noClass?: boolean; invite?: string }
);

export function PracticeDialog(props: Props) {
  const { initial, start, onSubmit, onClose, docked } = props;
  const { t } = useI18n();
  const w = t.pracWords;
  // `start` is an area, or a skill and level ("fractions.2", from the course map).
  const [startSkill, startLevel] = (start ?? "").split(".");
  const opening = (ALL_SKILLS as string[]).includes(startSkill) ? (startSkill as SkillId) : null;
  const [area, setArea] = useState<Area>(initial?.area ?? (opening ? areaOf(opening) : startOr(start, AREAS, "number")));
  const [pick, setPick] = useState<Pick>(initial?.skill ?? opening ?? "mixed");
  const [level, setLevel] = useState<Level>(initial?.level ?? (LEVELS.find((L) => opening && String(L) === startLevel) ?? 1));
  const [mode, setMode] = useState<Mode>(initial && initial.count === 1 ? "practise" : initial ? "sheet" : "practise");
  const [count, setCount] = useState(initial && initial.count > 1 ? initial.count : 8);
  const [withAnswers, setWithAnswers] = useState(initial?.answers ?? true);
  const [sheetSeed, setSheetSeed] = useState(initial?.seed ?? newSeed());
  const [progress, setProgress] = useState<Progress>(loadProgress);
  /** The placement under way (pick "place"), and whether the grade being practised was just found by one. */
  const [placing, setPlacing] = useState<Placement | null>(null);
  const [justPlaced, setJustPlaced] = useState(false);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 });
  // The page's free practice comes in sessions of five or ten questions (the student's choice), with a summary at the end,
  // and a word about a break after about 25 minutes of answering (PracticeSession.tsx).
  const page = !onSubmit;
  const [session, setSession] = useState<SessionResult[]>([]);
  const [length, setLength] = useState<Length>(sessionLength);
  const [summary, setSummary] = useState(false);
  const [stretch, setStretch] = useState<Stretch | null>(null);
  /** The ideas lit on the idea map during this session, marked new on the map after it. */
  const [sessionLit, setSessionLit] = useState<string[]>([]);
  /** A question of the session has ended: it joins the ring and the stretch without a break. */
  const recordSession = (skill: SkillId, right: boolean) => {
    setSession((r) => [...r, { skill, right }]);
    setStretch((st) => stretchAfter(st, Date.now()));
  };
  const chooseLength = (n: Length) => (keepLength(n), setLength(n));
  const [cheer, setCheer] = useState(0);
  const [quiet, setQuiet] = useState(muted);
  // Calm (feel.ts): silent and still, so the sound switch steps aside for it.
  const calm = useFeel() === "calm";
  const [scratch, setScratch] = useState(scratchWanted);

  // ---------- practise ----------

  // The class study's plan (null until loaded, or when nobody is signed in); kept in a ref because answering moves it on.
  const planRef = useRef<ClassPlan | null>(null);
  /** The signed-in student's idea map in class practice: lit from the plan's estimates, new when lit during this visit. */
  const classMap = useRef<LitMap>({ lit: [], fresh: [] });
  const predicted = (skill: SkillId, L: Level) => planRef.current?.model.predict({ student: ME, skill, level: L }) ?? null;
  /**
   * Whether the student has a feature of practice: in a class testing it, the arm without it doesn't (arms.ts). Their
   * plan says, or before it comes, what was kept when they signed in.
   */
  const has = (f: Feature) => studentHas(planRef.current ?? loadStudent(), f);
  /** The skill of the question on screen, so that a spaced review is on another skill when one is due. */
  const shownSkill = useRef<SkillId | undefined>(undefined);
  /**
   * The next question. In class practice, the student's homework comes first, in its order (homework.ts). Then missed
   * ones come back; then what was mastered days ago and is due for its spaced review
   * (spacing.ts: in class practice a skill, asked hard; in free practice a skill at a level); then, in class practice,
   * a step-down to one idea after an early failure (for the arm with it), or the student's condition chooses (fixed
   * sequence, or adaptive, which on a skill made of ideas aims at the weakest),
   * otherwise the topic and level picked above.
   */
  const nextExercise = (a: Area, p: Pick, L: Level, prog: Progress, plan: ClassPlan | null): Current => {
    const grade = currentGrade(prog.placed ?? null, prog.cells ?? {});
    const fits = (m: Cell) =>
      plan ? plan.skills.includes(m.skill)
      : p === "place" ? false // a placement asks only fresh questions
      : p === "grade" ? gradeOf(m.skill, m.level) === grade
      : p === "mixed" ? areaOf(m.skill) === a : m.skill === p;
    const homework = plan && nextHomework(plan.homework);
    if (homework) {
      const { skill, level, seed } = homework.item;
      return { ex: exercise(skill, level, seed, w), policy: "homework", review: false, predicted: predicted(skill, level) };
    }
    const due = prog.mistakes.find((m) => fits(m) && m.due <= prog.answered);
    if (due) return { ex: exercise(due.skill, due.level, due.seed, w), policy: "review", review: true, predicted: predicted(due.skill, due.level) };
    const last = shownSkill.current;
    const spaced = (skill: SkillId, L: Level): Current => ({ ex: exercise(skill, L, newSeed(), w), policy: "spaced", review: false, predicted: predicted(skill, L) });
    // A student in a class testing spaced review, in the arm without it, has none in class practice or free practice.
    const reviews = has("spaced");
    if (reviews && plan) {
      const k = nextReview(plan.spacing, Date.now(), (k) => fits({ skill: k as SkillId, level: 3 }), (k) => k, last);
      if (k) return spaced(k as SkillId, 3);
    } else if (reviews) {
      const cellOf = (k: string) => ({ skill: k.split(".")[0] as SkillId, level: Number(k.split(".")[1]) as Level });
      const k = nextReview(prog.spacing ?? {}, Date.now(), (k) => fits(cellOf(k)), (k) => cellOf(k).skill, last);
      if (k) return spaced(cellOf(k).skill, cellOf(k).level);
    }
    if (plan) {
      const { ex, policy } = classQuestion(plan, w, { unlockFloor: newcomerChance(plan.model), again: reviews ? (openAgain(plan.spacing) as SkillId[]) : [] });
      return { ex, policy, review: false, predicted: predicted(ex.skill, ex.level) };
    }
    if (p === "place" || p === "grade") {
      // A placement asks a level of the grade in the middle of those left; a grade's practice, a level not yet secure.
      const all = cellsOf(p === "place" ? probe(live.current.placing ?? startPlacement()) : grade);
      const open = all.filter((c) => !isSecure(prog.cells?.[cellKey(c)]));
      const c: Cell = randomOf(p === "grade" && open.length ? open : all);
      return { ex: exercise(c.skill, c.level, newSeed(), w), ...freeOrigin, predicted: predicted(c.skill, c.level) };
    }
    const skills = SKILLS[a] as readonly SkillId[];
    const skill = p === "mixed" ? skills[Math.floor(Math.random() * skills.length)] : p;
    return { ex: exercise(skill, L, newSeed(), w), ...freeOrigin, predicted: predicted(skill, L) };
  };
  const [cur, setCur] = useState<Current>(() =>
    initial?.count === 1 && initial.skill !== "mixed"
      ? { ex: exercise(initial.skill, initial.level, initial.seed, w), ...freeOrigin }
      : nextExercise(area, pick, level, progress, null),
  );
  const [input, setInput] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [wrongs, setWrongs] = useState(0);
  const [done, setDone] = useState<"solved" | "revealed" | null>(null);
  const [solution, setSolution] = useState<{ src?: string; error?: string } | null>(null);
  /** The ideas ticked as hard on this question, as the log keeps them for the attempt. */
  const [hard, setHard] = useState<string[]>([]);
  /** The student's word on this question's difficulty (free practice), and where it moved the level. */
  const [rated, setRated] = useState<{ r: Rating; level: Level; edge: boolean } | null>(null);
  /**
   * The question's steps: a fractions operation answered wrong is worked in them before the student tries the whole of
   * it again; and on any skill with steps, worked examples fade (fading.ts).
   */
  const steps = useMemo(() => stepsOf(cur.ex, w), [cur, w]);
  const [stepping, setStepping] = useState<"no" | "now" | "done">("no");
  /** A faded worked example: how many of the question's first steps are shown done (0: the question is asked whole). */
  const [given, setGiven] = useState(0);
  /** Free practice's fading when nobody is signed in (a student's comes with their plan). */
  const freeFading = useRef<Fading>(progress.fading ?? {});
  const inputRef = useRef<HTMLInputElement>(null);

  // ---------- the class study: what happens on each question is saved under the student's code ----------

  const [student, setStudent] = useState<Student | null>(loadStudent);
  const [pending, setPending] = useState(queued);
  // The plan lives in a ref (answering moves it on); this re-renders when it changes in place.
  const [, planChanged] = useReducer((n: number) => n + 1, 0);
  /** Class practice (the study chooses the questions) or free practice (the student does); only when signed in. */
  const [inClass, setInClass] = useState(() => !!student && !initial);
  const [planStatus, setPlanStatus] = useState<"none" | "loading" | "ready" | "error" | "gone">("none");
  const log = useRef<QuestionLog>(startLog());
  // State as of the last render, for listeners, the plan arriving, and closing.
  const live = useRef({ cur, student, inClass, progress, area, pick, level, placing });
  live.current = { cur, student, inClass, progress, area, pick, level, placing };
  const classPlan = () => (live.current.student && live.current.inClass ? planRef.current : null);
  const sendQueued = (keepalive = false) => {
    setPending(queued());
    void Promise.all([outbox.flush(keepalive), testOutbox.flush(keepalive)]).then(([a, b]) => setPending(a + b));
  };
  /** Lights the student's class idea map from the plan's estimates, and keeps it; quietly when the plan has just come. */
  const lightClass = (code: string, ideas: IdeaState, quietly = false) => {
    const next = lightUp(classMap.current, ideas, quietly);
    if (next === classMap.current) return;
    classMap.current = next;
    keepClassLit(code, next.lit);
    planChanged();
  };
  /** Records the question the student is leaving (moving on, changing topic, closing) and starts a fresh log. */
  const leaveQuestion = (keepalive = false) => {
    const { cur, student, inClass } = live.current;
    const attempt = student && toAttempt(log.current, cur.ex, cur, student);
    // Nobody signed in: the same record, kept only in this browser.
    const own = !student ? toAttempt(log.current, cur.ex, cur, { code: "", class: "", condition: "adaptive" }) : null;
    let p = live.current.progress;
    if (attempt) {
      outbox.add(attempt);
      // Free practice and reviews tell the model about the student too.
      if (planRef.current) {
        applyAttempt(planRef.current, attempt);
        if (hasIdeas(attempt.skill)) lightClass(attempt.student, planRef.current.ideas);
      }
    } else if (own) {
      // The fading moves on all the same, and is kept with the practice progress.
      learnFading(freeFading.current, own.skill, fadedOf(own));
      p = { ...p, fading: { ...freeFading.current } };
    }
    // Free practice moves the ideas the idea map shows, kept with the practice progress; a tile lit stays lit.
    const a = attempt || own;
    if (a && !(student && inClass) && hasIdeas(a.skill)) {
      const ideas = { ...p.ideas };
      learnFromAttempt(ideas, a);
      const fresh = newlyLit(p.lit ?? [], ideas);
      p = { ...p, ideas, lit: [...(p.lit ?? []), ...fresh] };
      if (fresh.length) setSessionLit((s) => [...s, ...fresh]);
    }
    if (p !== live.current.progress) {
      record(p);
      live.current.progress = p;
    }
    log.current = startLog();
    sendQueued(keepalive);
  };
  /** Fetches the student's plan; once it is here, a class question replaces one the student hasn't started on. */
  const loadPlan = async (s: Student) => {
    planRef.current = null;
    setPlanStatus("loading");
    try {
      await Promise.all([outbox.flush(), testOutbox.flush()]); // so the server's plan already counts what this browser has done
      const plan = toClassPlan(await study.plan(s.code));
      for (const a of outbox.items()) if (a.student === s.code) applyAttempt(plan, a); // still waiting to be sent
      markQueuedTests(plan, s.code);
      if (live.current.student?.code !== s.code) return; // signed out meanwhile
      planRef.current = plan;
      classMap.current = { lit: loadClassLit(s.code), fresh: [] };
      lightClass(s.code, plan.ideas, true);
      setPlanStatus("ready");
      const { inClass, progress, area, pick, level } = live.current;
      const untouched = !log.current.answers.length && !log.current.outcome && log.current.steps.length <= (log.current.faded ?? 0);
      if (inClass && untouched) show(nextExercise(area, pick, level, progress, plan));
    } catch (e) {
      // gone: the server has no such student (their answers were deleted, or the server was reset).
      if (live.current.student?.code === s.code) setPlanStatus(e instanceof ApiError && e.status === 404 ? "gone" : "error");
    }
  };
  // The teacher moves the class on from the dashboard: pick up the new phase, keeping the model this browser carries. In
  // free practice too, so homework made meanwhile is announced there (issue #301).
  useEffect(() => {
    if (!student || planStatus !== "ready") return;
    const timer = setInterval(async () => {
      try {
        const fresh = await study.plan(student.code);
        if (!planRef.current || live.current.student?.code !== student.code) return;
        planRef.current = withProtocol(planRef.current, fresh);
        markQueuedTests(planRef.current, student.code);
        planChanged();
      } catch {
        // offline for now: the next poll tries again
      }
    }, PROTOCOL_POLL_MS);
    return () => clearInterval(timer);
  }, [student, planStatus]);
  useEffect(() => {
    if (student) void loadPlan(student);
    sendQueued(); // anything left from an earlier visit
    const onHide = () => leaveQuestion(true);
    const onOnline = () => sendQueued();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("online", onOnline);
      leaveQuestion(true);
    };
    // Once, when the dialog opens: later students are loaded by changeStudent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const changeStudent = (s: Student | null, forgot = false) => {
    // What was done so far on this question belongs to whoever was signed in while doing it.
    if (forgot && student) {
      outbox.discard(student.code);
      testOutbox.discard(student.code);
      log.current = startLog();
    } else leaveQuestion();
    setStudent(s);
    saveStudent(s);
    setPending(queued());
    live.current.student = s;
    planRef.current = null;
    setPlanStatus("none");
    if (s) {
      setInClass(true);
      setMode("practise");
      void loadPlan(s);
    }
  };
  const switchPractice = (toClass: boolean) => {
    setInClass(toClass);
    live.current.inClass = toClass;
    if (toClass) setMode("practise");
    leaveQuestion();
    show(nextExercise(area, pick, level, progress, classPlan()));
  };

  // The words can change (language switch): rebuild the same question in the new language.
  useEffect(() => {
    setCur((c) => ({ ...c, ex: exercise(c.ex.skill, c.ex.level, c.ex.seed, w) }));
  }, [w]);

  const record = (p: Progress) => {
    setProgress(p);
    saveProgress(p);
  };
  /** The first final outcome of a question goes into the stats; a miss is queued for review. */
  const settle = (ok: boolean) => {
    const ex = cur.ex;
    finish(log.current, ok ? "solved" : "revealed");
    const s = progress.stats[ex.skill] ?? { seen: 0, right: 0 };
    const mistakes = progress.mistakes.filter((m) => !(m.skill === ex.skill && m.level === ex.level && m.seed === ex.seed));
    if (!ok) mistakes.push({ skill: ex.skill, level: ex.level, seed: ex.seed, due: progress.answered + 1 + REVIEW_AFTER });
    // Where the learner is in the course counts only right answers at the first try.
    const firstTry = ok && wrongs === 0;
    const key = cellKey(ex);
    let placed = progress.placed;
    // A level made secure comes back for review a day later, and further apart with each right review (spacing.ts).
    const cell = recordCell(progress.cells?.[key], firstTry);
    const spacing = { ...progress.spacing };
    learnSpacing(spacing, key, firstTry, isSecure(cell), Date.now());
    if (pick === "place" && placing) {
      const p = placementStep(placing, firstTry);
      setPlacing(p);
      live.current.placing = p;
      placed = placedGrade(p) ?? placed;
    }
    record({
      ...progress,
      stats: { ...progress.stats, [ex.skill]: { seen: s.seen + 1, right: s.right + (ok ? 1 : 0) } },
      mistakes,
      answered: progress.answered + 1,
      cells: { ...progress.cells, [key]: cell },
      spacing,
      placed,
    });
    setScore((sc) => ({ right: sc.right + (ok ? 1 : 0), total: sc.total + 1, streak: ok ? sc.streak + 1 : 0 }));
    if (sessionOn) recordSession(ex.skill, ok);
  };

  const showSolution = (ex: Exercise) => {
    log.current.solutionViewed = true;
    setSolution({});
    const done = (r: RenderedSvg) => setSolution({ src: svgToDataUrl(r.svg) });
    if (ex.solution)
      renderSolution(ex.solution, t)
        .then(done)
        .catch((e: Error) => (ex.steps ? done(renderSteps(ex.steps)) : setSolution({ error: e.message })));
    else if (ex.steps) done(renderSteps(ex.steps));
    else setSolution(null);
  };

  const onCheck = () => {
    if (done) return;
    const v = check(cur.ex, input, w);
    logAnswer(log.current, input, v);
    setVerdict(v);
    if (v.ok) {
      playSound("good");
      // Every few right in a row, a celebration.
      if (CHEER_AT.includes(score.streak + 1)) setCheer((c) => c + 1);
      settle(true);
      setDone("solved");
      return;
    }
    // A message (lowest terms, rounding, not factorised, unreadable) asks for another try without counting a miss.
    if (v.why) return;
    playSound("miss");
    const n = wrongs + 1;
    setWrongs(n);
    if (n === 1 && steps.length && STEPS_AFTER_MISS.includes(cur.ex.skill) && has("steps")) setStepping("now");
    else if (n >= 2) reveal();
  };
  const reveal = () => {
    if (!done) settle(false);
    setDone((d) => d ?? "revealed");
    showSolution(cur.ex);
  };
  /** Puts a new question up with a clean slate. */
  function show(c: Current) {
    shownSkill.current = c.ex.skill;
    // A question of a skill being faded comes with its first steps done; reviews and the placement are asked whole.
    const fading = live.current.student ? planRef.current?.fading : freeFading.current;
    const n = stepsOf(c.ex, w).length;
    const g = fading && has("faded") && !c.review && c.policy !== "spaced" && live.current.pick !== "place" ? givenSteps(fading, c.ex.skill, n) : 0;
    setGiven(g);
    log.current.faded = g || undefined;
    log.current.steps = Array.from({ length: g }, () => ({ answers: [], shown: true }));
    setCur(c);
    setInput("");
    setVerdict(null);
    setWrongs(0);
    setDone(null);
    setSolution(null);
    setHard([]);
    setRated(null);
    setStepping("no");
  }
  const next = () => {
    // Once the placement has found the grade, practising it comes next.
    if (pick === "place" && placing && placedGrade(placing)) {
      choose(area, "grade", level);
      setJustPlaced(true);
      return;
    }
    leaveQuestion();
    show(nextExercise(area, pick, level, progress, classPlan()));
    inputRef.current?.focus();
  };
  /** After the session's last question, its summary; after any other, the next question. */
  const onNext = () => {
    if (!sessionOver) return next();
    leaveQuestion();
    setSummary(true);
  };
  /** The next session, only ever from the student's tap on the summary, in the length they tapped. */
  const newSession = (n: Length) => {
    chooseLength(n);
    setSession([]);
    setSessionLit([]);
    setSummary(false);
    show(nextExercise(area, pick, level, progress, classPlan()));
  };
  // A new topic or level starts a new question (free practice only: class practice has no topic menus).
  const choose = (a: Area, p: Pick, L: Level) => {
    // From a session's summary, a new topic starts the next session.
    if (summary) (setSession([]), setSessionLit([]), setSummary(false));
    setArea(a);
    setPick(p);
    setLevel(L);
    setJustPlaced(false);
    if (p !== "place") {
      setPlacing(null);
      live.current.placing = null;
    }
    leaveQuestion();
    show(nextExercise(a, p, L, progress, null));
    setSheetSeed(newSeed());
  };

  const startPlace = () => {
    const p = startPlacement();
    setPlacing(p);
    live.current.placing = p;
    choose(area, "place", level);
  };

  const card = useMemo(() => {
    const ex = cur.ex;
    try {
      return { src: svgToDataUrl(renderPractice({ area: areaOf(ex.skill), skill: ex.skill, level: ex.level, seed: ex.seed, count: 1, answers: false }, w).svg) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [cur, w]);
  // The page and the panel show the question as text that wraps and scales with the screen, with the maths and any
  // picture beside it; the dialog shows the card that gets inserted.
  const question = useMemo(() => {
    if (onSubmit && !docked) return null;
    const ex = cur.ex;
    try {
      const q = ex.q ? latexToSvg(ex.q) : null;
      const p = ex.pic;
      // Figures can draw a little below their height, into the room the card leaves under them.
      const h = p && p.h + 16;
      const pic = p &&
        `<svg xmlns="http://www.w3.org/2000/svg" width="${p.w}" height="${h}" viewBox="0 0 ${p.w} ${h}"><rect width="${p.w}" height="${h}" fill="#ffffff"/>${p.svg(0, 0)}</svg>`;
      return {
        math: q && { src: svgToDataUrl(q.svg), width: q.width },
        pic: p && pic && { src: svgToDataUrl(pic), width: p.w },
      };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [cur, onSubmit, docked]);
  // The typed answer as maths, rendered by MathJax: that takes a moment, so it follows the typing rather than hold it up.
  const shown = useDeferredValue(input);
  const typed = useMemo(() => {
    const p = preview(cur.ex, shown);
    if (!p) return null;
    try {
      return svgToDataUrl(latexToSvg(p).svg);
    } catch {
      return null;
    }
  }, [cur, shown]);
  // Once a question is over after a wrong answer, a signed-in student is asked what exactly was hard: the ticks go with
  // the attempt and move their ideas (ideaState.ts), so they are asked only where something keeps them.
  // A question asked whole and missed, on a skill worked in steps: a worked example of the same kind with other numbers
  // (unless the question was just worked in steps), and the fading begins (fading.ts).
  const example = useMemo(() => {
    if (!done || given || steps.length < 2 || log.current.steps.length || !has("faded")) return null;
    if (attemptEvidence({ outcome: log.current.outcome ?? "skipped", answers: log.current.answers }) !== false) return null;
    const ex = exampleLike(cur.ex, w);
    return ex && { ex, steps: stepsOf(ex, w) };
  }, [done, cur, w, given, steps]);
  const hardChoices = useMemo(() => (done && student && has("hard") ? whatWasHard(cur.ex, log.current) : null), [done, cur, student]);
  const toggleHard = (id: string) => {
    const ticked = (hardChoices ?? []).filter((i) => (i === id) !== hard.includes(i));
    setHard(ticked);
    log.current.hard = ticked;
  };
  const answerSrc = useMemo(() => (done ? svgToDataUrl(latexToSvg(cur.ex.show, "#2f9e44").svg) : null), [cur, done]);

  // ---------- worksheet ----------

  const sheetSpec: PracticeSpec = { area, skill: pick === "grade" || pick === "place" ? "mixed" : pick, level, seed: sheetSeed, count, answers: withAnswers };
  const sheet = useMemo(() => {
    if (mode !== "sheet") return null;
    try {
      const rendered = renderPractice(sheetSpec, w);
      return { rendered, src: svgToDataUrl(rendered.svg) };
    } catch (e) {
      return { error: (e as Error).message };
    }
    // sheetSpec is rebuilt every render from exactly these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, area, pick, level, sheetSeed, count, withAnswers, w]);

  const insert = () => {
    if (!onSubmit) return;
    if (mode === "sheet") {
      if (sheet?.rendered) onSubmit(sheetSpec, sheet.rendered);
      return;
    }
    const ex = cur.ex;
    const spec: PracticeSpec = { area: areaOf(ex.skill), skill: ex.skill, level: ex.level, seed: ex.seed, count: 1, answers: done !== null };
    onSubmit(spec, renderPractice(spec, w));
  };

  const classOn = !!student && inClass;
  const sessionOn = page && !classOn && mode === "practise" && pick !== "place";
  const sessionOver = sessionOn && session.length >= length;
  // How hard the question felt is asked in class practice and in free practice of a topic or Mixed; a grade's practice
  // and the placement choose their own levels and are not asked.
  const rateable = mode === "practise" && (classOn || (pick !== "grade" && pick !== "place"));
  /**
   * The rating goes with the attempt. In free practice too easy or too hard also moves the level of the questions after
   * this one, and the level switch moves with it; in class practice the study chooses, so it is only recorded.
   */
  const rate = (r: Rating) => {
    log.current.rated = r;
    if (classOn) return setRated({ r, level, edge: false });
    const to = rateLevel(level, r);
    setRated({ r, ...to });
    if (to.level !== level) setLevel(to.level);
  };
  const levelName = (L: Level) => w.levels[String(L) as "1" | "2" | "3"];
  // What the student has kept and mastered of their class's skills, from the plan their answers carry forward.
  const held = planStatus === "ready" && planRef.current ? holds(planRef.current.spacing, planRef.current.skills) : null;
  const skillHolds = held && (Object.fromEntries(Object.entries(held).map(([h, ks]) => [h, ks.map((k) => w.skills[k as SkillId])])) as Record<Hold, string[]>);
  const invite = onSubmit ? undefined : props.invite;
  const studentPanel = <StudentPanel student={student} pending={pending} ui={w.ui} skills={skillHolds ?? undefined} invite={invite} onChange={changeStudent} />;
  const resetButton = progress.answered > 0 && (
    <button
      className="btn small add-fn"
      onClick={() => {
        freeFading.current = {};
        record(emptyProgress());
        setScore({ right: 0, total: 0, streak: 0 });
      }}
    >
      {w.ui.reset}
    </button>
  );
  // What the class's phase allows right now (class practice only; free practice is always open).
  const plan = classOn && planStatus === "ready" ? planRef.current : null;
  // The class idea map is the current question's skill; new ideas lit on another skill are counted on that one's map.
  const hereIdeas: readonly string[] = hasIdeas(cur.ex.skill) ? SKILL_IDEAS[cur.ex.skill] : [];
  const freshHere = classMap.current.fresh.filter((id) => hereIdeas.includes(id)).length;
  const testPhase = plan?.phase === "pretest" ? "pre" : plan?.phase === "posttest" ? "post" : plan?.phase === "delayed" ? "delayed" : null;
  // When a timed session runs out, one more render finds it over (the clock itself ticks on its own).
  const sessionEnds = plan?.phase === "session" ? plan.sessionEnds : null;
  const [, sessionEnded] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (sessionEnds === null || sessionEnds <= Date.now()) return;
    const timer = setTimeout(sessionEnded, sessionEnds - Date.now() + 50);
    return () => clearTimeout(timer);
  }, [sessionEnds]);
  // Homework isn't class practice: it can be done whatever the class is doing, until it is finished.
  const homeworkAt = plan?.homework && cur.policy === "homework" ? homeworkIndex(plan.homework, cur.ex) : -1;
  const stopped = !plan || homeworkAt >= 0 || nextHomework(plan.homework) ? null
    : plan.phase === "closed" ? w.ui.classClosed
    : plan.phase === "session" && plan.sessionEnds !== null && Date.now() >= plan.sessionEnds ? w.ui.sessionOver
    : null;
  const homeworkDone = !!plan?.homework && !nextHomework(plan.homework);
  // In free practice: homework still to do, announced with a way to it (issue #301).
  const waiting = student && !inClass && planStatus === "ready" ? planRef.current?.homework ?? null : null;
  const homeworkLeft = waiting && nextHomework(waiting) ? waiting.items.length - waiting.done.length : 0;
  const blocked = stopped && homeworkDone ? `${w.ui.homeworkDone} ${stopped}` : stopped;
  const stat = (s: SkillId) => progress.stats[s];
  const skills = SKILLS[area] as readonly SkillId[];

  const body = (
    <>
      {student && (
        <Segmented items={[true, false]} value={inClass} onChange={switchPractice} label={(c) => (c ? w.ui.classPractice : w.ui.freePractice)} />
      )}
      {homeworkLeft > 0 && waiting && (
        <div className="practice-homework-waiting field-row wrap" role="status">
          <span>📝 {fill(w.ui.homeworkWaiting, { n: homeworkLeft, of: waiting.items.length })}</span>
          <button className="btn small primary" onClick={() => switchPractice(true)}>{w.ui.homeworkGo}</button>
        </div>
      )}
      {!classOn && (pick === "place" || pick === "grade") ? (
        // The placement and a grade's practice choose the questions themselves: no topics or levels to pick.
        <div className="field-row wrap">
          <strong>{pick === "place" ? w.grades.place : fill(w.grades.practise, { grade: gradeName(currentGrade(progress.placed ?? null, progress.cells ?? {}), w.grades) })}</strong>
          <button className="btn small" onClick={() => choose(area, "mixed", level)}>{w.grades.topics}</button>
        </div>
      ) : !classOn && (
        <>
          <Tabs items={AREAS} value={area} onChange={(a) => choose(a, "mixed", level)} label={(a) => areaLabel(t, a)} />
          <small className="hint">{t.practiceHints[area]}</small>

          <div className="snippets">
            {(["mixed", ...skills] as (SkillId | "mixed")[]).map((s) => {
              const st = s === "mixed" ? undefined : stat(s);
              return (
                <button key={s} className={`chip text${pick === s ? " selected" : ""}`} aria-pressed={pick === s} onClick={() => choose(area, s, level)}>
                  {s === "mixed" ? w.mixed : w.skills[s]}
                  {st && st.seen > 0 && <span className="practice-stat"> {fill(w.ui.progress, { right: st.right, seen: st.seen })}</span>}
                </button>
              );
            })}
          </div>
          <div className="field-row">
            <Segmented items={LEVELS} value={level} onChange={(L) => choose(area, pick, L)} label={(L) => w.levels[String(L) as "1" | "2" | "3"]} />
            {onSubmit && (
              <Segmented items={["practise", "sheet"] as const} value={mode} onChange={setMode} label={(m) => (m === "practise" ? w.ui.practise : w.ui.sheet)} />
            )}
          </div>
        </>
      )}

      {classOn && planStatus !== "ready" ? (
        <>
          <div className="field-row">
            {planStatus === "gone" ? (
              <span className="error">{w.ui.noStudent}</span>
            ) : planStatus === "error" ? (
              <>
                <span className="error">{w.ui.planError}</span>
                <button className="btn small" onClick={() => student && void loadPlan(student)}>{w.ui.retry}</button>
              </>
            ) : (
              <span className="hint">{w.ui.loadingPlan}</span>
            )}
          </div>
          {!page && studentPanel}
        </>
      ) : plan && student && testPhase ? (
        <>
          <TestRunner
            key={testPhase}
            plan={plan}
            phase={testPhase}
            student={student}
            w={w}
            outbox={testOutbox}
            onAnswered={(item) => {
              plan.tests[testPhase].answered.push(item);
              planChanged();
              sendQueued();
            }}
          />
          {!page && studentPanel}
        </>
      ) : blocked ? (
        <>
          <div className="practice-verdict ok" role="status">{blocked}</div>
          {!page && studentPanel}
        </>
      ) : sessionOn && summary ? (
        <SessionSummary results={session} comingBack={progress.mistakes.length} n={length} w={w} onAgain={newSession}>
          {[...new Set(session.map((r) => r.skill))].filter(hasIdeas).map((skill) => (
            <IdeaMap key={skill} skill={skill} lit={progress.lit ?? []} fresh={sessionLit} w={w} />
          ))}
        </SessionSummary>
      ) : mode === "practise" ? (
        <>
          {plan?.phase === "session" && plan.sessionEnds !== null && (
            <Countdown until={plan.sessionEnds} left={(time) => fill(w.ui.timeLeft, { time })} />
          )}
          {sessionOn && breakDue(stretch) && <BreakPrompt w={w} onDismiss={() => setStretch(stretchAfter(null, Date.now()))} />}
          {sessionOn && <SessionRing results={session} n={length} streak={score.streak} w={w} onLength={chooseLength} />}
          {homeworkAt >= 0 && plan?.homework ? (
            <small className="hint practice-review">
              📝 {fill(w.ui.homework, { n: homeworkAt + 1, of: plan.homework.items.length })}
              {plan.homework.items[homeworkAt].why !== "practice" && ` · ${w.ui.homeworkWhy[plan.homework.items[homeworkAt].why as "repair" | "review" | "stretch"]}`}
            </small>
          ) : cur.review || cur.policy === "spaced" ? (
            <small className="hint practice-review">↻ {cur.review ? w.ui.review : w.ui.spaced}</small>
          ) : cur.policy === "stepdown" && plan?.stepDown.now ? (
            <small className="hint practice-review">↓ {fill(w.ui.stepDown, { idea: w.ideas[plan.stepDown.now.idea as keyof typeof w.ideas] })}</small>
          ) : (
            classOn && <small className="hint">{fill(w.ui.chosen, { skill: w.skills[cur.ex.skill], level: w.levels[String(cur.ex.level) as "1" | "2" | "3"] })}</small>
          )}
          {question ? (
            <div className="preview practice-question">
              {!classOn && !cur.review && (
                <small className="hint">{w.skills[cur.ex.skill]} · {w.levels[String(cur.ex.level) as "1" | "2" | "3"]}</small>
              )}
              <p className="practice-prompt" aria-hidden="true">{cur.ex.prompt}</p>
              {"error" in question ? (
                <span className="error">{question.error}</span>
              ) : (
                <>
                  {question.math && <img src={question.math.src} alt="" style={{ width: question.math.width * MATH_SCALE }} />}
                  {question.pic && !cur.ex.play && <img src={question.pic.src} alt="" style={{ width: question.pic.width * MATH_SCALE }} />}
                </>
              )}
              <SpokenMath text={cur.ex.prompt} tex={cur.ex.q} />
            </div>
          ) : (
            <div className="preview">
              {"error" in card ? <span className="error">{card.error}</span> : <img src={card.src} alt="" style={{ maxWidth: "100%" }} />}
              <SpokenMath text={cur.ex.prompt} tex={cur.ex.q} />
            </div>
          )}
          {/* A faded worked example is answered step by step below, not here. */}
          {!given && (
            <>
              {/* A question answered by doing has buttons of its own: in a label, a click anywhere would press the first. */}
              <AnswerField className="field" play={!!cur.ex.play}>
                <span>{w.ui.answerHere} <span className="hint">({w.formats[cur.ex.format]})</span></span>
                {cur.ex.play ? (
                  <PlayAnswer
                    key={`${cur.ex.skill}:${cur.ex.level}:${cur.ex.seed}`}
                    play={cur.ex.play}
                    look={w.ui.look}
                    onEnter={() => (done ? onNext() : onCheck())}
                    value={input}
                    disabled={done !== null}
                    label={cur.ex.prompt}
                    tone={done === "solved" ? "right" : verdict && !verdict.ok && !verdict.why ? "wrong" : null}
                    onChange={(s) => {
                      setInput(s);
                      setVerdict(null);
                    }}
                  />
                ) : (
                <div className="field-row">
                  <input
                    ref={inputRef}
                    className="mono practice-input"
                    spellCheck={false}
                    autoComplete="off"
                    value={input}
                    disabled={done !== null || stepping === "now"}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setVerdict(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if (done) onNext();
                      else onCheck();
                    }}
                  />
                  {typed && !done && <img className="practice-typed" src={typed} alt="" />}
                </div>
                )}
              </AnswerField>
              {cur.ex.format === "sign" && !done && (
                <SignPicks
                  onPick={(s) => {
                    setInput(s);
                    setVerdict(null);
                    inputRef.current?.focus();
                  }}
                />
              )}
              {cur.ex.answer.k === "order" && !done && (
                <ListPicks
                  items={cur.ex.answer.items.map((i) => i.text)}
                  typed={input}
                  onChange={(s) => {
                    setInput(s);
                    setVerdict(null);
                  }}
                />
              )}
              {cur.ex.answer.k === "divisors" && !done && (
                <TogglePicks
                  items={cur.ex.answer.offered.map(String)}
                  typed={input}
                  onChange={(s) => {
                    setInput(s);
                    setVerdict(null);
                  }}
                />
              )}
              {(cur.ex.answer.k === "near" || cur.ex.answer.k === "pick") && !done && (
                <ChoicePicks
                  choices={cur.ex.answer.options.map((o) => ({ label: o.text, value: o.plain }))}
                  onPick={(s) => {
                    setInput(s);
                    setVerdict(null);
                    inputRef.current?.focus();
                  }}
                />
              )}
              {cur.ex.answer.k === "target" && !done && (
                <TargetPicks
                  cards={cur.ex.answer.puzzle.cards}
                  ops={cur.ex.answer.puzzle.ops}
                  onPick={(s) => {
                    setInput((x) => addPiece(x, s));
                    setVerdict(null);
                    inputRef.current?.focus();
                  }}
                  onBack={() => {
                    setInput(dropPiece);
                    setVerdict(null);
                  }}
                />
              )}
            </>
          )}
          <div className="field-row practice-actions">
            {!done && !given && stepping !== "now" && <button className="btn primary" onClick={onCheck}>{w.ui.check}</button>}
            {!done && !given && <button className="btn" onClick={reveal}>{w.ui.reveal}</button>}
            {done && <button className="btn primary" onClick={onNext}>{sessionOver ? w.ui.seeSummary : `${w.ui.next} →`}</button>}
            {!sessionOn && <span className="hint">{fill(w.ui.score, score)}</span>}
            {!calm && (
              <button
                className="btn small practice-sound"
                title={w.ui.sound}
                aria-label={w.ui.sound}
                aria-pressed={!quiet}
                onClick={() => (setMuted(!quiet), setQuiet(!quiet))}
              >
                {quiet ? "🔇" : "🔊"}
              </button>
            )}
            <button className="btn small practice-calm" title={w.ui.calmWhy} aria-pressed={calm} onClick={() => setFeel(calm ? "arcade" : "calm")}>
              🌙 {w.ui.calm}
            </button>
            {/* On a board the board itself is the paper. */}
            {page && (
              <button className="btn small practice-scratch" aria-pressed={scratch} onClick={() => (wantScratch(!scratch), setScratch(!scratch))}>
                ✏️ {w.ui.scratch.title}
              </button>
            )}
            {cheer > 0 && done === "solved" && CHEER_AT.includes(score.streak) && (
              <Cheer key={cheer} text={`🔥 ${score.streak}`} small />
            )}
          </div>
          {verdict && (
            <div className={`practice-verdict ${verdict.ok ? "ok" : verdict.close || verdict.why ? "close" : "bad"}`} role="status">
              {verdict.ok ? `✓ ${w.ui.correct}` : verdict.why ?? `✗ ${w.ui.wrong}`}
              {verdict.hint && <div className="practice-hint">{verdict.hint}</div>}
            </div>
          )}
          {page && scratch && <ScratchPad key={`${cur.ex.skill}:${cur.ex.level}:${cur.ex.seed}`} w={w.ui.scratch} />}
          {stepping !== "no" && !done && (
            <WorkInSteps
              key={`${cur.ex.skill}:${cur.ex.level}:${cur.ex.seed}`}
              steps={steps}
              w={w}
              onAnswer={(i, typed, v) => logStep(log.current, i, typed, v)}
              onShow={(i) => logStep(log.current, i, null)}
              onDone={() => {
                setStepping("done");
                setInput("");
                setVerdict(null);
                setTimeout(() => inputRef.current?.focus());
              }}
            />
          )}
          {given > 0 && (
            <WorkInSteps
              key={`faded:${cur.ex.skill}:${cur.ex.level}:${cur.ex.seed}:${given}`}
              steps={steps}
              w={w}
              given={given}
              intro={fill(w.ui.fadedIntro, { k: given, n: steps.length })}
              onAnswer={(i, typed, v) => logStep(log.current, i, typed, v)}
              onShow={(i) => logStep(log.current, i, null)}
              onDone={(right) => {
                // A question of the session, but not in the stats or the course: some of it was done for the student.
                finish(log.current, right ? "solved" : "revealed");
                setDone(right ? "solved" : "revealed");
                if (sessionOn) recordSession(cur.ex.skill, right);
              }}
            />
          )}
          {done === "revealed" && <div className="practice-verdict close" role="status">{w.ui.revealed}</div>}
          {done && rateable && (
            <div className="practice-rate" role="group" aria-label={w.ui.rateAsk}>
              {rated ? (
                <span role="status">
                  {classOn ? w.ui.rateNoted
                    : rated.edge ? (rated.r === "easy" ? w.ui.rateTop : w.ui.rateBottom)
                    : rated.r === "right" ? fill(w.ui.rateKeep, { level: levelName(rated.level) })
                    : fill(w.ui.rateNext, { level: levelName(rated.level) })}
                </span>
              ) : (
                <>
                  <span>{w.ui.rateAsk}</span>
                  {RATINGS.map((r) => (
                    <button key={r} className="btn small" onClick={() => rate(r)}>
                      {RATE_ICON[r]} {w.ui.rate[r]}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
          {done && (
            <div className="field">
              <span>{w.answer}</span>
              <div className="preview">
                {answerSrc && <img src={answerSrc} alt="" style={{ maxWidth: "100%" }} />}
                <SpokenMath tex={cur.ex.show} />
              </div>
              {done === "solved" && !solution && (cur.ex.solution || cur.ex.steps) && (
                <button className="btn small add-fn" onClick={() => showSolution(cur.ex)}>{w.ui.reveal}</button>
              )}
              {solution && (
                <div className="preview">
                  {solution.src ? <img src={solution.src} alt="" style={{ maxWidth: "100%" }} /> : solution.error ? <span className="error">{solution.error}</span> : <span className="hint">{w.ui.solving}</span>}
                </div>
              )}
            </div>
          )}
          {example && (
            <div className="practice-example">
              <WorkInSteps
                key={`example:${example.ex.skill}:${example.ex.level}:${example.ex.seed}`}
                steps={example.steps}
                w={w}
                given={example.steps.length}
                intro={w.ui.workedExample}
                onAnswer={() => {}}
                onShow={() => {}}
              />
            </div>
          )}
          {hardChoices && (
            <fieldset className="practice-hard">
              <legend>{w.ui.whatWasHard}</legend>
              {hardChoices.map((id) => (
                <label key={id} className="check inline">
                  <input type="checkbox" checked={hard.includes(id)} onChange={() => toggleHard(id)} />
                  <span>{w.ideas[id]}</span>
                </label>
              ))}
              <small className="hint">{w.ui.hardNote}</small>
            </fieldset>
          )}
          {plan && hasIdeas(cur.ex.skill) && (
            <details className="idea-map-open">
              <summary>
                🗺 {w.ui.ideaMapOpen}
                {freshHere > 0 && ` · ✨ ${fill(w.ui.ideaMapFresh, { n: freshHere })}`}
              </summary>
              <IdeaMap skill={cur.ex.skill} lit={classMap.current.lit} fresh={classMap.current.fresh} w={w} />
            </details>
          )}
          {!page && studentPanel}
          {!page && resetButton}
        </>
      ) : (
        <>
          <div className="range-grid">
            <Segmented items={[4, 6, 8, 10, 12, 16, 20]} value={count} onChange={setCount} label={(n) => String(n)} ariaLabel={w.ui.count} />
            <label className="check">
              <input type="checkbox" checked={withAnswers} onChange={(e) => setWithAnswers(e.target.checked)} />
              <span>{w.ui.withAnswers}</span>
            </label>
            <button className="btn small" onClick={() => setSheetSeed(newSeed())}>🎲 {w.ui.newSet}</button>
          </div>
          <div className="preview">
            {sheet?.src ? <img src={sheet.src} alt="" style={{ maxWidth: "100%" }} /> : <span className="error">{sheet?.error}</span>}
          </div>
        </>
      )}
    </>
  );

  // The page has no board to insert into, so no worksheet either; beside the practice, the grade and what comes back (the
  // session's ring sits with the question, where the student is looking).
  if (!onSubmit)
    return (
      <div className="practice-layout">
        <div className="practice-body">{body}</div>
        <aside className="practice-side">
          {!classOn && (
            <GradeCard
              progress={progress}
              placing={pick === "place" ? placing : null}
              practising={pick === "grade"}
              justPlaced={justPlaced}
              onPractise={() => choose(area, "grade", level)}
              onPlace={startPlace}
              w={w.grades}
            />
          )}
          <ComingBack mistakes={progress.mistakes} answered={progress.answered} w={w} />
          {!props.noClass && studentPanel}
          {resetButton}
        </aside>
      </div>
    );
  const title = initial ? t.editPractice : t.practice;
  const insertButton = (
    <button className="btn primary" disabled={classOn && (planStatus !== "ready" || !!testPhase || !!blocked) ? true : mode === "sheet" ? !sheet?.rendered : "error" in card} onClick={insert}>
      {initial ? t.update : t.insert}
    </button>
  );
  if (docked)
    return (
      <aside className="dock" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>×</button>
        </header>
        <div className="modal-body">{body}</div>
        <footer className="modal-footer">{insertButton}</footer>
      </aside>
    );
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>{t.cancel}</button>
          {insertButton}
        </>
      }
    >
      {body}
    </Modal>
  );
}
