// The teacher's page for the class study (#/teacher): make classes and hand out their codes, run the protocol (open
// practice, pre-test, timed sessions, post-test), then follow each class: the two groups side by side, the tests,
// mastery by skill for every student, and whether the learner model's predictions come true. The teacher password
// (TEACHER_PASSWORD on the server) is kept for this tab only.
import { useEffect, useMemo, useState } from "react";
import { ApiError, teacherApi, type ClassSummary, type Dashboard } from "../api";
import { CalibrationChart } from "../components/CalibrationChart";
import { HeatLegend, MasteryHeatmap } from "../components/MasteryHeatmap";
import { LangSelect, useI18n } from "../i18n";
import { fill } from "../math/chart";
import type { Phase } from "../learner";
import { AREAS, type Area, type SkillId } from "../math/practiceSkills";
import { DEFAULT_TEST_LENGTH, MAX_TEST_LENGTH, MIN_TEST_LENGTH } from "../model/testForms";

const PHASES: Phase[] = ["open", "pretest", "session", "posttest", "closed"];
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const KEY = "zeno.teacher";
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

type Access = "checking" | "locked" | "wrong" | "open" | "offline";

export function TeacherPage() {
  const { t, lang } = useI18n();
  const w = t.teacher;
  const [password, setPassword] = useState(remembered);
  const [typed, setTyped] = useState("");
  const [access, setAccess] = useState<Access>("checking");
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [showNumbers, setShowNumbers] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [testLength, setTestLength] = useState(DEFAULT_TEST_LENGTH);
  const [minutes, setMinutes] = useState(20);
  const [askMinutes, setAskMinutes] = useState(false);
  const [now, setNow] = useState(Date.now);
  const api = useMemo(() => teacherApi(password), [password]);

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
      setAccess(e instanceof ApiError && e.status === 403 ? (typedIn ? "wrong" : "locked") : "offline");
    }
  };
  useEffect(() => {
    void unlock(password, false);
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
  }, [access, selected]);

  const create = async () => {
    try {
      const made = await api.create(name.trim(), areas.length ? areas : undefined, testLength);
      setName("");
      setAreas([]);
      setTestLength(DEFAULT_TEST_LENGTH);
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

  // A running session's clock (hooks stay above the password gate's early return).
  const sessionEnds = classes.find((c) => c.code === selected && c.phase === "session")?.sessionEnds ?? null;
  useEffect(() => {
    if (sessionEnds === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sessionEnds]);

  const header = (
    <header className="home-header">
      <div className="brand">
        <a href="#/" className="muted small">← {w.back}</a>
        <h1>{w.title}</h1>
      </div>
      <LangSelect />
    </header>
  );

  if (access !== "open")
    return (
      <div className="home teacher">
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
          </form>
        )}
      </div>
    );

  const current = classes.find((c) => c.code === selected);
  const describe = (g: { n: number; mean: number | null; sd: number | null }) =>
    g.n ? fill(w.meanSd, { mean: share(g.mean), sd: g.sd === null ? "—" : num(g.sd * 100, 1), n: g.n }) : "—";
  const groups = data && (["adaptive", "fixed"] as const).map((c) => [c, data.conditions[c]] as const);
  const rows: [string, (g: Dashboard["conditions"]["fixed"]) => string][] = [
    [w.metrics.students, (g) => num(g.students)],
    [w.metrics.answered, (g) => num(g.answered)],
    [w.metrics.classPractice, (g) => num(g.classPractice)],
    [w.metrics.rightFirst, (g) => share(g.rightFirst)],
    [w.metrics.predicted, (g) => share(g.predicted)],
    [w.metrics.offTarget, (g) => share(g.offTarget)],
    [w.metrics.medianTime, (g) => (g.medianSeconds === null ? "—" : fill(w.seconds, { n: num(g.medianSeconds) }))],
    [w.metrics.solutionViewed, (g) => share(g.solutionViewed)],
    [w.metrics.skipped, (g) => share(g.skipped)],
    [w.practiceMinutes, (g) => (g.practiceMinutes === null ? "—" : fill(w.minutesValue, { n: num(g.practiceMinutes, 1) }))],
  ];

  return (
    <div className="home teacher">
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
                    <span className="muted small">{fill(w.studentsCount, { n: c.students, a: c.adaptive, f: c.fixed })}</span>
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
            <span className="hint">{w.skillsHint}</span>
            <div className="snippets">
              {AREAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`chip text${areas.includes(a) ? " selected" : ""}`}
                  aria-pressed={areas.includes(a)}
                  onClick={() => setAreas((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]))}
                >
                  {areaLabel(a)}
                </button>
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
              </div>
              <div className="field-row wrap">
                <button className="btn" onClick={() => selected && void load(selected)}>{w.refresh}</button>
                <button className="btn" onClick={() => void download("attempts")}>⤓ {w.download}</button>
                <button className="btn" onClick={() => void download("tests")}>⤓ {w.downloadTests}</button>
              </div>
            </section>
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
              {sessionEnds !== null && (
                <strong className="practice-clock" role="timer">
                  {now < sessionEnds ? fill(w.sessionLeft, { time: clock(sessionEnds - now) }) : w.sessionEnded}
                </strong>
              )}
              <p className="hint">{w.phaseHint}</p>
            </section>
          )}

          {data && data.class.code === selected && (
            <>
              {!data.students.length && <p className="muted">{w.noStudents}</p>}

              <section className="card">
                <h3>{w.groups}</h3>
                <p className="hint">{w.groupsHint}</p>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th />
                      {groups!.map(([c]) => <th key={c} scope="col">{c === "adaptive" ? w.adaptive : w.fixed}</th>)}
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

              <section className="card">
                <h3>{w.tests}</h3>
                <p className="hint">{w.testsHint}</p>
                {groups!.some(([, g]) => g.pre.n || g.post.n) ? (
                  <>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th />
                          {groups!.map(([c]) => <th key={c} scope="col">{c === "adaptive" ? w.adaptive : w.fixed}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {([[w.pre, "pre"], [w.post, "post"], [w.gain, "gain"]] as const).map(([label, key]) => (
                          <tr key={key}>
                            <th scope="row">{label}</th>
                            {groups!.map(([c, g]) => <td key={c}>{describe(g[key])}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <dl className="stat-tiles">
                      <div><dt>{w.effect}</dt><dd>{num(data.tests.effect, 2)}</dd></div>
                    </dl>
                    <p className="hint">{w.effectHint}</p>
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
                    <HeatLegend pct={pct} noAnswers={w.noAnswers} />
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
                    <CalibrationChart bins={data.calibration.bins} words={w} pct={pct} />
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
  );
}
