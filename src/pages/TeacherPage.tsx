// The teacher's page for the class study (#/teacher): make classes, each testing one feature (arms.ts), and hand out
// their codes, run the protocol (open practice, pre-test, timed sessions, post-test, delayed post-test), then follow
// each class: the two arms side by side, the tests by intention to treat, mastery by skill for every student, and
// whether the learner model's predictions come true. The teacher password
// (TEACHER_PASSWORD on the server) is kept for this tab only.
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { api as boardApi, ApiError, teacherApi, type ClassSummary, type Dashboard } from "../api";
import { Countdown } from "../components/Countdown";
import { HeatLegend, MasteryHeatmap } from "../components/MasteryHeatmap";
import { StuckList } from "../components/StuckList";
import { HomeworkCard } from "../components/HomeworkCard";
import { JoinLink } from "../components/JoinLink";
import { BrandBar } from "../components/BrandBar";
import { useI18n } from "../i18n";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";
import type { Phase } from "../learner";
import { AREAS, type Area, type SkillId } from "../math/practiceSkills";
import { GRADES, skillsOfGrade } from "../model/curriculum";
import { DEFAULT_TEST_LENGTH, MAX_TEST_LENGTH, MIN_TEST_LENGTH, TEST_PHASES } from "../model/testForms";
import { ARMS, FEATURES, type Feature } from "../model/arms";
import { TEACHER_KEY } from "../teacherMode";

// Printing the tests renders every question with MathJax, and the calibration chart has its own code: both load when
// first shown, so the dashboard itself doesn't carry them.
const PrintableTests = lazy(() => import("../components/PrintableTests").then((m) => ({ default: m.PrintableTests })));
const PaperTest = lazy(() => import("../components/PaperTest").then((m) => ({ default: m.PaperTest })));
const CalibrationChart = lazy(() => import("../components/CalibrationChart").then((m) => ({ default: m.CalibrationChart })));

const PHASES: Phase[] = ["open", "pretest", "session", "posttest", "delayed", "closed"];
const DAY = 86_400_000;

const KEY = TEACHER_KEY;
const remembered = () => {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};
const remember = (password: string) => {
  try {
    sessionStorage.setItem(KEY, password);
  } catch {
    // private mode: the password is asked for again next time
  }
};

/** waiting: too many wrong passwords; the server won't check another for a few minutes. */
type Access = "checking" | "locked" | "wrong" | "waiting" | "open" | "offline";

/** An area or a year to practise, on or off. */
function PickChip({ pick, picks, setPicks, title, children }: { pick: string; picks: string[]; setPicks: (f: (s: string[]) => string[]) => void; title?: string; children: ReactNode }) {
  const on = picks.includes(pick);
  return (
    <button type="button" className={`chip text${on ? " selected" : ""}`} aria-pressed={on} title={title}
      onClick={() => setPicks((s) => (on ? s.filter((x) => x !== pick) : [...s, pick]))}>
      {children}
    </button>
  );
}

export function TeacherPage() {
  const { t, lang } = useI18n();
  const w = t.teacher;
  const [password, setPassword] = useState(remembered);
  const [typed, setTyped] = useState("");
  const [access, setAccess] = useState<Access>("checking");
  const [printing, setPrinting] = useState(false);
  const [typingPaper, setTypingPaper] = useState(false);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState("");
  // Areas and years of the syllabus ("P4") the new class practises, as the server takes them.
  const [picks, setPicks] = useState<string[]>([]);
  const [showNumbers, setShowNumbers] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [testLength, setTestLength] = useState(DEFAULT_TEST_LENGTH);
  const [feature, setFeature] = useState<Feature>("policy");
  const [minutes, setMinutes] = useState(20);
  const [askMinutes, setAskMinutes] = useState(false);
  // The class whose deletion is waiting for a second click (null: none).
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const api = useMemo(() => teacherApi(password), [password]);
  const numbers = useMemo(() => new Map(data?.students.map((r) => [r.id, r.number]) ?? []), [data]);

  const pct = useMemo(() => {
    const f = new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 0 });
    return (v: number) => f.format(v);
  }, [lang]);
  const num = (v: number | null, digits = 0) => (v === null ? "—" : v.toLocaleString(lang, { maximumFractionDigits: digits }));
  // Rounded first, so a tiny negative shows as 0 % rather than "-0 %".
  const share = (v: number | null) => (v === null ? "—" : pct(Math.round(v * 100) / 100 || 0));
  const areaLabel = (a: Area) =>
    ({ number: t.practiceNumber, algebra: t.practiceAlgebra, geometry: t.practiceGeometry, calculus: t.practiceCalculus, data: t.practiceData })[a];
  const skillName = (k: SkillId) => t.pracWords.skills[k];

  /** Opens with a password: the class list loads, or the server says it wants another one. */
  const unlock = async (pw: string, typedIn: boolean) => {
    try {
      const list = await teacherApi(pw).classes();
      setPassword(pw);
      remember(pw);
      setClasses(list);
      setAccess("open");
      setSelected((s) => s ?? list.at(-1)?.code ?? null);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setAccess(status === 403 ? (typedIn ? "wrong" : "locked") : status === 429 ? "waiting" : "offline");
    }
  };
  useEffect(() => {
    void unlock(password, false);
    // Once, with the password remembered from last time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async (code: string) => {
    setLoading(true);
    setFailed(false);
    try {
      setData(await api.dashboard(code));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (access === "open" && selected) void load(selected);
    // load is a plain function of this render; the class shown changes only with access and selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, selected]);

  const create = async () => {
    try {
      const made = await api.create(name.trim(), picks.length ? picks : undefined, testLength, feature);
      setName("");
      setPicks([]);
      setTestLength(DEFAULT_TEST_LENGTH);
      setFeature("policy");
      setClasses(await api.classes());
      setSelected(made.code);
    } catch {
      setFailed(true);
    }
  };
  /** Moves the selected class on, then shows it as the server now has it. */
  const moveTo = async (phase: Phase) => {
    if (!selected) return;
    try {
      await api.setPhase(selected, phase, phase === "session" ? minutes : undefined);
      setAskMinutes(false);
      setClasses(await api.classes());
    } catch {
      setFailed(true);
    }
  };
  /**
   * Deletes a class, once confirmed on the page (a native confirm() is blocked in some browsers and embedded views,
   * where it answers "no" without showing anything); only one nobody has joined, which the server checks too.
   */
  const removeClass = async (klass: ClassSummary) => {
    setConfirmDelete(null);
    if (klass.students > 0) return;
    try {
      await api.remove(klass.code);
      const list = await api.classes();
      setClasses(list);
      setData(null);
      setSelected(list.at(-1)?.code ?? null);
    } catch {
      setFailed(true);
    }
  };
  /** Takes a stuck student off the list, then shows the class as the server now has it. */
  const seen = async (row: { student: string; skill: string; through: number }) => {
    if (!selected) return;
    try {
      await api.seen(selected, row.student, row.skill, row.through);
      await load(selected);
    } catch {
      setFailed(true);
    }
  };
  const download = async (kind: "attempts" | "tests") => {
    try {
      const blob = await api.csv(kind, selected ?? undefined);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `zeno-${kind}-${selected ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setFailed(true);
    }
  };

  // A running session's clock.
  const sessionEnds = classes.find((c) => c.code === selected && c.phase === "session")?.sessionEnds ?? null;

  // A fresh board straight from here, so a teacher about to explain something doesn't detour through the boards list.
  const newBoard = async () => {
    setFailed(false);
    try {
      const b = await boardApi.create(t.untitled);
      location.hash = `#/b/${b.id}`;
    } catch {
      setFailed(true);
    }
  };

  const bar = (
    <BrandBar>
      <a href="#/">{t.myBoards}</a>
      <button className="btn small primary" onClick={() => void newBoard()}>+ {t.newBoard}</button>
    </BrandBar>
  );
  const header = <h1 className="z-page-title">{w.title}</h1>;

  if (access !== "open")
    return (
      <div className="z z-wide">
        {bar}
        <div className="z-page teacher">
          {header}
          {access === "checking" ? (
            <p className="muted">{t.loading}</p>
          ) : access === "offline" ? (
            <p className="error" role="alert">{w.loadFailed}</p>
          ) : (
            <form
              className="teacher-login"
              onSubmit={(e) => {
                e.preventDefault();
                void unlock(typed, true);
              }}
            >
              <label className="field">
                <span>{w.password}</span>
                <input type="password" autoComplete="current-password" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
              </label>
              <button className="btn primary" type="submit">{w.open}</button>
              {access === "wrong" && <p className="error" role="alert">{w.wrongPassword}</p>}
              {access === "waiting" && <p className="error" role="alert">{w.tooManyTries}</p>}
            </form>
          )}
        </div>
      </div>
    );

  const current = classes.find((c) => c.code === selected);
  const describe = (g: { n: number; mean: number | null; sd: number | null }) =>
    g.n ? fill(w.meanSd, { mean: share(g.mean), sd: g.sd === null ? "—" : num(g.sd * 100, 1), n: g.n }) : "—";
  const groups = data && ARMS.map((a) => [a, data.arms[a]] as const);
  const armName = data ? w.features[data.class.feature] : null;
  // The tests the class has reached, and how long after the post-test the delayed one came (or how long it has been).
  const reached = data ? TEST_PHASES.filter((p) => data.tests.started[p] !== null) : [];
  const days = (from: number, to: number) => Math.floor((to - from) / DAY);
  const { post: postStart, delayed: delayedStart } = data?.tests.started ?? { post: null, delayed: null };
  type Group = Dashboard["arms"]["on"];
  const rows: (readonly [string, (g: Group) => string])[] = [
    [w.metrics.students, (g) => num(g.students)],
    [w.metrics.answered, (g) => num(g.answered)],
    [w.metrics.classPractice, (g) => num(g.classPractice)],
    // Only a class testing step-down has any.
    ...(data?.class.feature === "stepdown" ? [[w.metrics.stepDown, (g: Group) => num(g.stepDown)] as const] : []),
    [w.metrics.kept, (g) => num(g.kept, 1)],
    [w.metrics.mastered, (g) => num(g.mastered, 1)],
    [w.metrics.rightFirst, (g) => share(g.rightFirst)],
    [w.metrics.predicted, (g) => share(g.predicted)],
    [w.metrics.offTarget, (g) => share(g.offTarget)],
    [w.metrics.medianTime, (g) => (g.medianSeconds === null ? "—" : fill(w.seconds, { n: num(g.medianSeconds) }))],
    [w.metrics.solutionViewed, (g) => share(g.solutionViewed)],
    [w.metrics.skipped, (g) => share(g.skipped)],
    [w.practiceMinutes, (g) => (g.practiceMinutes === null ? "—" : fill(w.minutesValue, { n: num(g.practiceMinutes, 1) }))],
  ];

  return (
    <div className="z z-wide">
      {bar}
      <div className="z-page teacher">
        {header}
        {failed && <p className="error" role="alert">{w.loadFailed}</p>}
        <div className="teacher-grid">
          <aside className="teacher-side">
            <h2>{w.classes}</h2>
            {classes.length ? (
              <ul className="class-list">
                {classes.map((c) => (
                  <li key={c.code}>
                    <button className={`class-item${c.code === selected ? " selected" : ""}`} aria-pressed={c.code === selected} onClick={() => setSelected(c.code)}>
                      <strong>{c.name}</strong>
                      <span className="mono small">{c.code}</span>
                      <span className="muted small">{w.features[c.feature].name}{!c.study && ` · ${w.notInStudy}`}</span>
                      <span className="muted small">{fill(w.studentsCount, { n: c.students, a: c.on, f: c.off })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{w.noClasses}</p>
            )}
            <form
              className="new-class"
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              <h3>{w.newClass}</h3>
              <label className="field">
                <span>{w.className}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              </label>
              <label className="field">
                <span>{w.testLength}</span>
                <input type="number" min={MIN_TEST_LENGTH} max={MAX_TEST_LENGTH} value={testLength}
                  onChange={(e) => setTestLength(Math.min(MAX_TEST_LENGTH, Math.max(MIN_TEST_LENGTH, Math.round(Number(e.target.value) || DEFAULT_TEST_LENGTH))))} />
              </label>
              <label className="field">
                <span>{w.feature}</span>
                <select value={feature} onChange={(e) => setFeature(e.target.value as Feature)}>
                  {FEATURES.map((f) => <option key={f} value={f}>{w.features[f].name}</option>)}
                </select>
              </label>
              <span className="hint">{w.features[feature].hint} {w.featureHint}</span>
              <span className="hint">{w.skillsHint}</span>
              <div className="snippets">
                {AREAS.map((a) => (
                  <PickChip key={a} pick={a} picks={picks} setPicks={setPicks}>
                    {areaLabel(a)}
                  </PickChip>
                ))}
              </div>
              <span className="hint">{w.yearsHint}</span>
              <div className="snippets">
                {GRADES.map((g) => (
                  <PickChip key={g} pick={`G${g}`} picks={picks} setPicks={setPicks} title={skillsOfGrade(g).map(skillName).join(", ")}>
                    {g === 13 ? w.university : g === 10 || g === 12 ? fill(w.years, { a: g - 1, b: g }) : fill(w.year, { n: g })}
                  </PickChip>
                ))}
              </div>
              <button className="btn primary" type="submit">{w.create}</button>
            </form>
          </aside>

          <main className={`teacher-main${loading ? " refreshing" : ""}`}>
            {current && (
              <section className="class-head">
                <div>
                  <h2>{current.name}</h2>
                  <p className="class-code">
                    <span className="muted">{w.code}</span> <strong className="mono">{current.code}</strong>
                  </p>
                  <p className="hint">{w.codeHint}</p>
                  <JoinLink key={current.code} code={current.code} name={current.name} w={w} />
                </div>
                <div className="field-row wrap">
                  <button className="btn" onClick={() => selected && void load(selected)}>{w.refresh}</button>
                  <button className="btn" onClick={() => void download("attempts")}>⤓ {w.download}</button>
                  <button className="btn" onClick={() => void download("tests")}>⤓ {w.downloadTests}</button>
                  <button className="btn" onClick={() => setPrinting(true)}>{w.printTests}</button>
                  {confirmDelete !== current.code && (
                    <button className="btn danger" disabled={current.students > 0} title={current.students > 0 ? w.deleteClassHasStudents : undefined}
                      onClick={() => setConfirmDelete(current.code)}>
                      {w.deleteClass}
                    </button>
                  )}
                </div>
                {confirmDelete === current.code && (
                  <div className="field-row wrap" role="alert">
                    <span className="error">{w.deleteClassConfirm}</span>
                    <button className="btn danger" autoFocus onClick={() => void removeClass(current)}>{w.deleteClass}</button>
                    <button className="btn" onClick={() => setConfirmDelete(null)}>{t.cancel}</button>
                  </div>
                )}
              </section>
            )}
            {printing && current && (
              <Suspense fallback={null}>
                <PrintableTests klass={current} w={w} pw={t.pracWords} onClose={() => setPrinting(false)} />
              </Suspense>
            )}

            {/* Who needs the teacher now comes first. */}
            {data && data.class.code === selected && !!data.students.length && (
              <StuckList stuck={data.stuck} numbers={numbers} t={t} skillName={skillName} showCodes={showCodes} onSeen={(r) => void seen(r)} />
            )}

            {current && (
              <section className="card">
                <h3>{w.phase}</h3>
                <div className="phase-buttons" role="group" aria-label={w.phase}>
                  {PHASES.map((p) => (
                    <button
                      key={p}
                      className={`btn small${current.phase === p ? " primary" : ""}`}
                      aria-pressed={current.phase === p}
                      onClick={() => (p === "session" ? setAskMinutes(true) : void moveTo(p))}
                    >
                      {w.phases[p]}
                    </button>
                  ))}
                </div>
                {askMinutes && (
                  <div className="field-row">
                    <label className="field-row">
                      <span>{w.minutes}</span>
                      <input type="number" min={1} max={240} value={minutes} style={{ width: 80 }}
                        onChange={(e) => setMinutes(Math.min(240, Math.max(1, Math.round(Number(e.target.value) || 20))))} />
                    </label>
                    <button className="btn primary small" onClick={() => void moveTo("session")}>{w.start}</button>
                  </div>
                )}
                {sessionEnds !== null && <Countdown until={sessionEnds} left={(time) => fill(w.sessionLeft, { time })} ended={w.sessionEnded} />}
                {data?.class.code === selected && postStart !== null && (
                  <p className="hint delayed-when">
                    {delayedStart !== null ? fill(w.delayedAfter, { n: days(postStart, delayedStart) }) : fill(w.delayedWhen, { n: days(postStart, Date.now()) })}
                  </p>
                )}
                <p className="hint">{w.phaseHint}</p>
              </section>
            )}

            {data && data.class.code === selected && current && (
              <HomeworkCard klass={current} data={data} api={api} t={t} lang={lang} showCodes={showCodes} onChanged={() => {
                if (selected) void load(selected);
                void api.classes().then(setClasses, () => setFailed(true));
              }} />
            )}

            {data && data.class.code === selected && (
              <>
                {!data.students.length && <p className="muted">{w.noStudents}</p>}

                {!!data.students.length && <FindCode students={data.students} w={w} />}

                {!!data.students.length && current && (
                  <details key={current.code} className="card paper-card" onToggle={(e) => setTypingPaper(e.currentTarget.open)}>
                    <summary><h3>{w.paperTest}</h3></summary>
                    <p className="hint">{w.paperTestHint}</p>
                    {typingPaper && (
                      <Suspense fallback={null}>
                        <PaperTest klass={current} students={data.students} api={api} w={w} pw={t.pracWords} onSaved={() => selected && void load(selected)} />
                      </Suspense>
                    )}
                  </details>
                )}

                <section className="card">
                  <h3>{w.groups}</h3>
                  <p className="hint">{fill(w.groupsHint, { feature: armName!.name })}</p>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th />
                        {groups!.map(([a]) => <th key={a} scope="col">{armName![a]}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(([label, value]) => (
                        <tr key={label}>
                          <th scope="row">{label}</th>
                          {groups!.map(([c, g]) => <td key={c}>{value(g)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section className="card tests-card">
                  <h3>{w.tests}</h3>
                  <p className="hint">{w.testsHint}</p>
                  {reached.length ? (
                    <>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th />
                            {groups!.map(([a]) => <th key={a} scope="col">{armName![a]}</th>)}
                            <th scope="col" title={w.effect}>d</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reached.map((p) => (
                            <tr key={p} data-test={p}>
                              <th scope="row">{w[p]}</th>
                              {groups!.map(([a, g]) => (
                                <td key={a}>
                                  {describe(g[p])}
                                  <br />
                                  <span className="muted small">{fill(w.finished, { k: g[p].finished, n: g[p].n })}</span>
                                </td>
                              ))}
                              <td>{num(data.tests.effect[p], 2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="hint">d: {w.effect}. {w.effectHint}</p>
                      <h3>{w.formCheck}</h3>
                      <table className="data-table">
                        <tbody>
                          <tr><th scope="row">{w.formA}</th><td>{describe(data.tests.forms.A)}</td></tr>
                          <tr><th scope="row">{w.formB}</th><td>{describe(data.tests.forms.B)}</td></tr>
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <p className="muted">{w.noTests}</p>
                  )}
                </section>

                {!!data.students.length && (
                  <section className="card">
                    <h3>{w.mastery}</h3>
                    <p className="hint">{w.masteryHint}</p>
                    <div className="field-row wrap">
                      <HeatLegend pct={pct} noAnswers={w.noAnswers} holds={w.holds} />
                      <label className="check inline">
                        <input type="checkbox" checked={showNumbers} onChange={(e) => setShowNumbers(e.target.checked)} />
                        <span>{w.showNumbers}</span>
                      </label>
                      <label className="check inline">
                        <input type="checkbox" checked={showCodes} onChange={(e) => setShowCodes(e.target.checked)} />
                        <span>{w.showCodes}</span>
                      </label>
                    </div>
                    <MasteryHeatmap data={data} words={w} skillName={skillName} pct={pct} showNumbers={showNumbers} showCodes={showCodes} />
                  </section>
                )}

                <section className="card">
                  <h3>{w.calibration}</h3>
                  <p className="hint">{w.calibrationHint}</p>
                  {data.calibration.n ? (
                    <div className="calib-row">
                      <Suspense fallback={<div className="calib-chart" />}>
                        <CalibrationChart bins={data.calibration.bins} words={w} pct={pct} />
                      </Suspense>
                      <div className="calib-side">
                        <dl className="stat-tiles">
                          <div><dt>{w.answers}</dt><dd>{num(data.calibration.n)}</dd></div>
                          <div><dt>{w.logLoss}</dt><dd>{num(data.calibration.logLoss, 3)}</dd></div>
                          <div><dt>{w.auc}</dt><dd>{num(data.calibration.auc, 3)}</dd></div>
                        </dl>
                        <label className="check inline">
                          <input type="checkbox" checked={showTable} onChange={(e) => setShowTable(e.target.checked)} />
                          <span>{w.showTable}</span>
                        </label>
                        {showTable && (
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th scope="col">{w.bin}</th>
                                <th scope="col">{w.predictedAxis}</th>
                                <th scope="col">{w.observedAxis}</th>
                                <th scope="col">{w.answers}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.calibration.bins.filter((b) => b.n).map((b) => (
                                <tr key={b.from}>
                                  <th scope="row">{pct(b.from)}–{pct(b.to)}</th>
                                  <td>{pct(b.predicted)}</td>
                                  <td>{pct(b.observed)}</td>
                                  <td>{num(b.n)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="muted">{w.noPredictions}</p>
                  )}
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/**
 * A student who lost their code tells the teacher their number in the class list, and the teacher reads the code from
 * here (closed until opened, so the codes aren't shown on a projector). A number given twice is flagged: two records
 * for one student (who joined again on another device), or a typo; the one with the answers is usually theirs.
 */
function FindCode({ students, w }: { students: Dashboard["students"]; w: Dict["teacher"] }) {
  const twice = new Set(students.map((r) => r.number).filter((n, i, all) => n !== null && all.indexOf(n) !== i));
  const sorted = [...students].sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity));
  return (
    <details className="card find-code">
      <summary><h3>{w.findCode}</h3></summary>
      <p className="hint">{w.findCodeHint}</p>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{w.listNo}</th>
            <th scope="col">{w.studentCode}</th>
            <th scope="col">{w.answers}</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.number ?? "—"}</th>
              <td className="mono">{r.code}</td>
              <td>{r.answered}</td>
              <td className="hint">{r.number !== null && twice.has(r.number) ? w.sameNumber : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
