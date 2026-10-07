import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ApiError, study } from "../api";
import { useI18n } from "../i18n";
import {
  applyAttempt, finish, localSlot, loadStudent, logAnswer, ME, Outbox, saveStudent, startLog, toAttempt, toClassPlan, withProtocol, type ClassPlan,
  type Origin, type QuestionLog, type Student, type TestAnswer,
} from "../learner";
import { choose as choosePolicy } from "../model/policy";
import type { Dict } from "../locales/en";
import { fill } from "../math/chart";
import { latexToSvg, type RenderedSvg } from "../math/latex";
import {
  AREAS, areaOf, check, exercise, LEVELS, preview, renderPractice, renderSteps, SKILLS, type Area, type Exercise, type Level, type PracticeSpec,
  type SkillId, type Verdict,
} from "../math/practice";
import { renderSolution } from "../math/practiceSolve";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { StudentPanel } from "./StudentPanel";
import { TestRunner } from "./TestRunner";
import { Segmented, startOr, Tabs } from "./ui";

type Mode = "practise" | "sheet";
type Pick = SkillId | "mixed";

// ---------- progress, kept in this browser ----------

type Stat = { seen: number; right: number };
/** A missed question comes back once `due` more questions have been answered. */
type Mistake = { skill: SkillId; level: Level; seed: number; due: number };
type Progress = { stats: Partial<Record<SkillId, Stat>>; mistakes: Mistake[]; answered: number };
const KEY = "zeno.practice.v1";
const empty = (): Progress => ({ stats: {}, mistakes: [], answered: 0 });
function load(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as Progress | null;
    return p && typeof p.answered === "number" && Array.isArray(p.mistakes) ? p : empty();
  } catch {
    return empty();
  }
}
function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // private mode or full storage: progress just isn't kept
  }
}
/** Questions answered before a missed one comes back. */
const REVIEW_AFTER = 3;

const newSeed = () => Math.floor(Math.random() * 2 ** 31);
const areaLabel = (t: Dict, a: Area) =>
  ({ number: t.practiceNumber, algebra: t.practiceAlgebra, geometry: t.practiceGeometry, calculus: t.practiceCalculus, data: t.practiceData })[a];

type Current = { ex: Exercise } & Origin;
const freeOrigin: Origin = { policy: "free", review: false, predicted: null };

/** Finished questions of a student in a class study, on their way to the server. */
const outbox = new Outbox(localSlot("zeno.outbox.v1"), study.send);
/** Their test answers, the same way. */
const testOutbox = new Outbox<TestAnswer>(localSlot("zeno.testbox.v1"), study.sendTest);
const queued = () => outbox.items().length + testOutbox.items().length;
/** How often the dialog asks whether the teacher has moved the class on (a new phase, a session starting). */
const PROTOCOL_POLL_MS = 30_000;
/** Test answers still waiting to be sent count as answered, so the test doesn't ask the same question twice. */
function markQueuedTests(plan: ClassPlan, studentCode: string) {
  for (const a of testOutbox.items())
    if (a.student === studentCode && !plan.tests[a.phase].answered.includes(a.item)) plan.tests[a.phase].answered.push(a.item);
}
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function PracticeDialog({ initial, start, onSubmit, onClose }: {
  initial?: PracticeSpec;
  start?: string;
  onSubmit: (spec: PracticeSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.pracWords;
  const [area, setArea] = useState<Area>(initial?.area ?? startOr(start, AREAS, "number"));
  const [pick, setPick] = useState<Pick>(initial?.skill ?? "mixed");
  const [level, setLevel] = useState<Level>(initial?.level ?? 1);
  const [mode, setMode] = useState<Mode>(initial && initial.count === 1 ? "practise" : initial ? "sheet" : "practise");
  const [count, setCount] = useState(initial && initial.count > 1 ? initial.count : 8);
  const [withAnswers, setWithAnswers] = useState(initial?.answers ?? true);
  const [sheetSeed, setSheetSeed] = useState(initial?.seed ?? newSeed());
  const [progress, setProgress] = useState<Progress>(load);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 });

  // ---------- practise ----------

  // The class study's plan (null until loaded, or when nobody is signed in); kept in a ref because answering moves it on.
  const planRef = useRef<ClassPlan | null>(null);
  const predicted = (skill: SkillId, L: Level) => planRef.current?.model.predict({ student: ME, skill, level: L }) ?? null;
  /**
   * The next question. Missed ones come back first; then, in class practice, the student's condition chooses
   * (fixed sequence or adaptive), otherwise the topic and level picked above.
   */
  const nextExercise = (a: Area, p: Pick, L: Level, prog: Progress, plan: ClassPlan | null): Current => {
    const fits = (m: Mistake) => (plan ? plan.skills.includes(m.skill) : p === "mixed" ? areaOf(m.skill) === a : m.skill === p);
    const due = prog.mistakes.find((m) => fits(m) && m.due <= prog.answered);
    if (due) return { ex: exercise(due.skill, due.level, due.seed, w), policy: "review", review: true, predicted: predicted(due.skill, due.level) };
    if (plan) {
      const c = choosePolicy(plan.condition, plan.model, ME, plan.skills, plan.position, { recent: plan.recent });
      return { ex: exercise(c.skill, c.level, newSeed(), w), policy: plan.condition, review: false, predicted: predicted(c.skill, c.level) };
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
  const live = useRef({ cur, student, inClass, progress, area, pick, level });
  live.current = { cur, student, inClass, progress, area, pick, level };
  const classPlan = () => (live.current.student && live.current.inClass ? planRef.current : null);
  const sendQueued = (keepalive = false) => {
    setPending(queued());
    void Promise.all([outbox.flush(keepalive), testOutbox.flush(keepalive)]).then(([a, b]) => setPending(a + b));
  };
  /** Records the question the student is leaving (moving on, changing topic, closing) and starts a fresh log. */
  const leaveQuestion = (keepalive = false) => {
    const { cur, student } = live.current;
    const attempt = student && toAttempt(log.current, cur.ex, cur, student);
    if (attempt) {
      outbox.add(attempt);
      // Free practice and reviews tell the model about the student too.
      if (planRef.current) applyAttempt(planRef.current, attempt);
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
      setPlanStatus("ready");
      const { inClass, progress, area, pick, level } = live.current;
      if (inClass && !log.current.answers.length && !log.current.outcome) show(nextExercise(area, pick, level, progress, plan));
    } catch (e) {
      // gone: the server has no such student (their answers were deleted, or the server was reset).
      if (live.current.student?.code === s.code) setPlanStatus(e instanceof ApiError && e.status === 404 ? "gone" : "error");
    }
  };
  // The teacher moves the class on from the dashboard: pick up the new phase, keeping the model this browser carries.
  useEffect(() => {
    if (!student || !inClass || planStatus !== "ready") return;
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
  }, [student, inClass, planStatus]);
  // A timed session's clock.
  const sessionEnds = planRef.current?.phase === "session" ? planRef.current.sessionEnds : null;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (sessionEnds === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sessionEnds]);
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
    save(p);
  };
  /** The first final outcome of a question goes into the stats; a miss is queued for review. */
  const settle = (ok: boolean) => {
    const ex = cur.ex;
    finish(log.current, ok ? "solved" : "revealed");
    const s = progress.stats[ex.skill] ?? { seen: 0, right: 0 };
    const mistakes = progress.mistakes.filter((m) => !(m.skill === ex.skill && m.level === ex.level && m.seed === ex.seed));
    if (!ok) mistakes.push({ skill: ex.skill, level: ex.level, seed: ex.seed, due: progress.answered + 1 + REVIEW_AFTER });
    record({ stats: { ...progress.stats, [ex.skill]: { seen: s.seen + 1, right: s.right + (ok ? 1 : 0) } }, mistakes, answered: progress.answered + 1 });
    setScore((sc) => ({ right: sc.right + (ok ? 1 : 0), total: sc.total + 1, streak: ok ? sc.streak + 1 : 0 }));
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
      settle(true);
      setDone("solved");
      return;
    }
    // A message (lowest terms, rounding, not factorised, unreadable) asks for another try without counting a miss.
    if (v.why) return;
    const n = wrongs + 1;
    setWrongs(n);
    if (n >= 2) reveal();
  };
  const reveal = () => {
    if (!done) settle(false);
    setDone((d) => d ?? "revealed");
    showSolution(cur.ex);
  };
  /** Puts a new question up with a clean slate. */
  function show(c: Current) {
    setCur(c);
    setInput("");
    setVerdict(null);
    setWrongs(0);
    setDone(null);
    setSolution(null);
  }
  const next = () => {
    leaveQuestion();
    show(nextExercise(area, pick, level, progress, classPlan()));
    inputRef.current?.focus();
  };
  // A new topic or level starts a new question (free practice only: class practice has no topic menus).
  const choose = (a: Area, p: Pick, L: Level) => {
    setArea(a);
    setPick(p);
    setLevel(L);
    leaveQuestion();
    show(nextExercise(a, p, L, progress, null));
    setSheetSeed(newSeed());
  };

  const card = useMemo(() => {
    const ex = cur.ex;
    try {
      return renderPractice({ area: areaOf(ex.skill), skill: ex.skill, level: ex.level, seed: ex.seed, count: 1, answers: false }, w);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [cur, w]);
  const typed = useMemo(() => {
    const p = preview(cur.ex, input);
    if (!p) return null;
    try {
      return svgToDataUrl(latexToSvg(p).svg);
    } catch {
      return null;
    }
  }, [cur, input]);

  // ---------- worksheet ----------

  const sheetSpec: PracticeSpec = { area, skill: pick, level, seed: sheetSeed, count, answers: withAnswers };
  const sheet = useMemo(() => {
    if (mode !== "sheet") return null;
    try {
      return { rendered: renderPractice(sheetSpec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [mode, area, pick, level, sheetSeed, count, withAnswers, w]);

  const insert = () => {
    if (mode === "sheet") {
      if (sheet?.rendered) onSubmit(sheetSpec, sheet.rendered);
      return;
    }
    const ex = cur.ex;
    const spec: PracticeSpec = { area: areaOf(ex.skill), skill: ex.skill, level: ex.level, seed: ex.seed, count: 1, answers: done !== null };
    onSubmit(spec, renderPractice(spec, w));
  };

  const classOn = !!student && inClass;
  // What the class's phase allows right now (class practice only; free practice is always open).
  const plan = classOn && planStatus === "ready" ? planRef.current : null;
  const testPhase = plan?.phase === "pretest" ? "pre" : plan?.phase === "posttest" ? "post" : null;
  const blocked = !plan ? null
    : plan.phase === "closed" ? w.ui.classClosed
    : plan.phase === "session" && plan.sessionEnds !== null && now >= plan.sessionEnds ? w.ui.sessionOver
    : null;
  const stat = (s: SkillId) => progress.stats[s];
  const skills = SKILLS[area] as readonly SkillId[];

  return (
    <Modal
      title={initial ? t.editPractice : t.practice}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>{t.cancel}</button>
          <button className="btn primary" disabled={classOn && (planStatus !== "ready" || !!testPhase || !!blocked) ? true : mode === "sheet" ? !sheet?.rendered : "error" in card} onClick={insert}>
            {initial ? t.update : t.insert}
          </button>
        </>
      }
    >
      {student && (
        <Segmented items={[true, false]} value={inClass} onChange={switchPractice} label={(c) => (c ? w.ui.classPractice : w.ui.freePractice)} />
      )}
      {!classOn && (
        <>
          <Tabs items={AREAS} value={area} onChange={(a) => choose(a, "mixed", level)} label={(a) => areaLabel(t, a)} />
          <small className="hint">{t.practiceHints[area]}</small>

          <div className="snippets">
            {(["mixed", ...skills] as Pick[]).map((s) => {
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
            <Segmented items={["practise", "sheet"] as const} value={mode} onChange={setMode} label={(m) => (m === "practise" ? w.ui.practise : w.ui.sheet)} />
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
          <StudentPanel student={student} pending={pending} ui={w.ui} onChange={changeStudent} />
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
          <StudentPanel student={student} pending={pending} ui={w.ui} onChange={changeStudent} />
        </>
      ) : blocked ? (
        <>
          <div className="practice-verdict ok" role="status">{blocked}</div>
          <StudentPanel student={student} pending={pending} ui={w.ui} onChange={changeStudent} />
        </>
      ) : mode === "practise" ? (
        <>
          {plan?.phase === "session" && plan.sessionEnds !== null && (
            <strong className="practice-clock" role="timer">{fill(w.ui.timeLeft, { time: clock(plan.sessionEnds - now) })}</strong>
          )}
          {cur.review ? (
            <small className="hint practice-review">↻ {w.ui.review}</small>
          ) : (
            classOn && <small className="hint">{fill(w.ui.chosen, { skill: w.skills[cur.ex.skill], level: w.levels[String(cur.ex.level) as "1" | "2" | "3"] })}</small>
          )}
          <div className="preview">
            {"error" in card ? <span className="error">{card.error}</span> : <img src={svgToDataUrl(card.svg)} alt="" style={{ maxWidth: "100%" }} />}
          </div>
          <label className="field">
            <span>{w.ui.answerHere} <span className="hint">({w.formats[cur.ex.format]})</span></span>
            <div className="field-row">
              <input
                ref={inputRef}
                className="mono practice-input"
                spellCheck={false}
                autoComplete="off"
                value={input}
                disabled={done !== null}
                onChange={(e) => {
                  setInput(e.target.value);
                  setVerdict(null);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (done) next();
                  else onCheck();
                }}
              />
              {typed && !done && <img className="practice-typed" src={typed} alt="" />}
            </div>
          </label>
          <div className="field-row">
            {!done && <button className="btn primary" onClick={onCheck}>{w.ui.check}</button>}
            {!done && <button className="btn" onClick={reveal}>{w.ui.reveal}</button>}
            {done && <button className="btn primary" onClick={next}>{w.ui.next} →</button>}
            <span className="hint">{fill(w.ui.score, score)}</span>
          </div>
          {verdict && (
            <div className={`practice-verdict ${verdict.ok ? "ok" : verdict.close || verdict.why ? "close" : "bad"}`} role="status">
              {verdict.ok ? `✓ ${w.ui.correct}` : verdict.why ?? `✗ ${w.ui.wrong}`}
            </div>
          )}
          {done === "revealed" && <div className="practice-verdict close" role="status">{w.ui.revealed}</div>}
          {done && (
            <div className="field">
              <span>{w.answer}</span>
              <div className="preview">
                <img src={svgToDataUrl(latexToSvg(cur.ex.show, "#2f9e44").svg)} alt="" style={{ maxWidth: "100%" }} />
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
          <StudentPanel student={student} pending={pending} ui={w.ui} onChange={changeStudent} />
          {progress.answered > 0 && (
            <button
              className="btn small add-fn"
              onClick={() => {
                record(empty());
                setScore({ right: 0, total: 0, streak: 0 });
              }}
            >
              {w.ui.reset}
            </button>
          )}
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
            {sheet?.rendered ? <img src={svgToDataUrl(sheet.rendered.svg)} alt="" style={{ maxWidth: "100%" }} /> : <span className="error">{sheet?.error}</span>}
          </div>
        </>
      )}
    </Modal>
  );
}
