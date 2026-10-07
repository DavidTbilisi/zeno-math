// The teacher's page for the class study (#/teacher): make classes and hand out their codes, then follow each class:
// the two groups side by side, mastery by skill for every student, and whether the learner model's predictions come
// true. The teacher password (TEACHER_PASSWORD on the server) is kept for this tab only.
import { useEffect, useMemo, useState } from "react";
import { ApiError, teacherApi, type ClassSummary, type Dashboard } from "../api";
import { CalibrationChart } from "../components/CalibrationChart";
import { HeatLegend, MasteryHeatmap } from "../components/MasteryHeatmap";
import { LangSelect, useI18n } from "../i18n";
import { fill } from "../math/chart";
import { AREAS, type Area, type SkillId } from "../math/practiceSkills";

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
  const api = useMemo(() => teacherApi(password), [password]);

  const pct = useMemo(() => {
    const f = new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 0 });
    return (v: number) => f.format(v);
  }, [lang]);
  const num = (v: number | null, digits = 0) => (v === null ? "—" : v.toLocaleString(lang, { maximumFractionDigits: digits }));
  const share = (v: number | null) => (v === null ? "—" : pct(v));
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
      const made = await api.create(name.trim(), areas.length ? areas : undefined);
      setName("");
      setAreas([]);
      setClasses(await api.classes());
      setSelected(made.code);
    } catch {
      setFailed(true);
    }
  };
  const download = async () => {
    try {
      const blob = await api.csv(selected ?? undefined);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `zeno-${selected ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setFailed(true);
    }
  };

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
              <div className="field-row">
                <button className="btn" onClick={() => selected && void load(selected)}>{w.refresh}</button>
                <button className="btn" onClick={() => void download()}>⤓ {w.download}</button>
              </div>
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
