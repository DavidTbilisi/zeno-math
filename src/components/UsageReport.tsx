// The usage page (#615), on the teacher's page at #/teacher/usage: the anonymous counts of the last days as figures,
// a column for each day's visits, the way from the front page to practising, and what was opened most, each as a
// ranked list with a bar. One colour throughout (ink): there is one series, so the headings say what is drawn.
import { useEffect, useMemo, useState } from "react";
import type { UsageKind, UsageReport as Report, UsageRow } from "../../server/usage";
import type { teacherApi } from "../api";
import { useI18n } from "../i18n";
import { LANGS } from "../langs";
import { fill } from "../math/text";
import type { SkillId } from "../math/practiceSkills";
import { scaleTop } from "../usage";
import { useChartTip } from "./ChartTip";
import { Tabs } from "./ui";

const RANGES = ["7", "30", "90"] as const;
type Range = (typeof RANGES)[number];
/** The steps from arriving to practising, in the order a newcomer takes them. */
const WAY = ["account made", "signed in", "class joined", "question tried", "board made"] as const;
const LISTS: UsageKind[] = ["page", "tool", "skill", "from", "screen", "lang", "visit", "error"];
const SHORT = 8;

export function UsageReport({ api }: { api: ReturnType<typeof teacherApi> }) {
  const { t, lang } = useI18n();
  const u = t.site.usage;
  const [range, setRange] = useState<Range>("30");
  const [report, setReport] = useState<Report | null>(null);
  const [failed, setFailed] = useState(false);
  const [all, setAll] = useState<ReadonlySet<UsageKind>>(new Set());
  const { bind, view } = useChartTip();

  useEffect(() => {
    let live = true;
    setFailed(false);
    api.usage(Number(range)).then((r) => live && setReport(r), () => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [api, range]);

  const num = (v: number) => v.toLocaleString(lang);
  const dayName = useMemo(() => {
    const f = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" });
    return (day: string) => f.format(new Date(`${day}T00:00:00Z`));
  }, [lang]);

  /** A counted name in the reader's words, where it has any: a step, a screen, a language, a skill. */
  const nameOf = (kind: UsageKind, name: string): string => {
    const own: Partial<Record<UsageKind, Record<string, string>>> = { step: u.steps, screen: u.screens, visit: u.sites };
    if (name === "(other)") return u.other;
    if (kind === "lang") return LANGS.find((l) => l.code === name)?.label ?? name;
    if (kind === "skill") return t.pracWords.skills[name as SkillId] ?? name;
    return own[kind]?.[name] ?? name;
  };

  const head = (
    <div className="usage-head">
      <a className="small" href="#/teacher">← {u.back}</a>
      <h1 className="z-page-title">{u.title}</h1>
      <Tabs items={RANGES} value={range} onChange={setRange} label={(k) => fill(u.days, { n: k })} />
    </div>
  );
  if (failed) return <>{head}<p className="error" role="alert">{u.failed}</p></>;
  if (!report) return <>{head}<p className="muted">{t.loading}</p></>;

  const sum = (rows: UsageRow[], key: "hits" | "visits" = "hits") => rows.reduce((n, r) => n + r[key], 0);
  const step = (name: string) => report.kinds.step.find((r) => r.name === name);
  const visits = sum(report.kinds.visit);
  const top = scaleTop(Math.max(...report.days.map((d) => d.hits)));
  // A date under about six of the columns, the last one always.
  const every = Math.ceil(report.days.length / 6);
  const labelled = (i: number) => (report.days.length - 1 - i) % every === 0;
  const way = [{ name: "visit", label: u.visits, visits }, ...WAY.map((name) => ({ name, label: u.steps[name], visits: step(name)?.visits ?? 0 }))];
  const empty = !visits && LISTS.every((k) => !report.kinds[k].length);

  return (
    <>
      {head}
      {!report.on && <p className="usage-note">{u.off}</p>}
      {empty ? (
        <p className="muted">{u.none}</p>
      ) : (
        <>
          <dl className="usage-tiles">
            <div><dt>{u.visits}</dt><dd>{num(visits)}</dd></div>
            <div><dt>{u.pagesOpened}</dt><dd>{num(sum(report.kinds.page))}</dd></div>
            <div><dt>{u.questions}</dt><dd>{num(step("question tried")?.hits ?? 0)}</dd></div>
            <div><dt>{u.accounts}</dt><dd>{num(step("account made")?.hits ?? 0)}</dd></div>
          </dl>

          <section className="usage-card">
            <h2>{u.perDay}</h2>
            <div className="usage-days" role="group" aria-label={u.perDay}>
              <div className="usage-scale" aria-hidden="true">
                {[top, top / 2, 0].map((v) => <span key={v}>{num(v)}</span>)}
              </div>
              <div className="usage-plot">
                {report.days.map((d, i) => (
                  <div key={d.day} className="usage-day" tabIndex={0} aria-label={`${dayName(d.day)}: ${fill(u.visitsCount, { n: num(d.hits) })}`}
                    {...bind(() => ({ value: num(d.hits), label: fill(u.visitsOn, { day: dayName(d.day) }) }))}>
                    <span className="usage-col" style={{ height: `${(d.hits / top) * 100}%` }} />
                    {labelled(i) && <span className="usage-date">{dayName(d.day)}</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="usage-card">
            <h2>{u.way}</h2>
            <p className="muted small">{u.wayHint}</p>
            <Rows rows={way.map((r) => ({ key: r.name, label: r.label, visits: r.visits }))} num={num} cols={[u.cols.step, u.visits]} />
          </section>

          <div className="usage-lists">
            {LISTS.filter((k) => report.kinds[k].length).map((kind) => {
              const rows = report.kinds[kind];
              const shown = all.has(kind) ? rows : rows.slice(0, SHORT);
              return (
                <section key={kind} className={`usage-card${kind === "error" ? " usage-wide" : ""}`}>
                  <h2>{u.kinds[kind]}</h2>
                  <Rows rows={shown.map((r) => ({ key: r.name, label: nameOf(kind, r.name), visits: r.visits, hits: r.hits }))}
                    max={rows[0].visits} num={num} cols={[u.cols.name, u.visits, u.cols.times]} />
                  {rows.length > SHORT && (
                    <button className="usage-more" aria-expanded={all.has(kind)}
                      onClick={() => setAll((s) => new Set(s.has(kind) ? [...s].filter((k) => k !== kind) : [...s, kind]))}>
                      {all.has(kind) ? u.showFewer : fill(u.showAll, { n: num(rows.length) })}
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
      <p className="usage-note muted small">{u.what}</p>
      {view}
    </>
  );
}

/** A ranked list as a table: the name, a bar as long as its visits, the visits, and how many times where that is counted. */
function Rows({ rows, max, num, cols }: {
  rows: { key: string; label: string; visits: number; hits?: number }[];
  max?: number;
  num: (v: number) => string;
  cols: string[];
}) {
  const full = Math.max(1, max ?? Math.max(...rows.map((r) => r.visits)));
  return (
    <table className="usage-rows">
      <thead>
        <tr>
          <th scope="col">{cols[0]}</th>
          <td aria-hidden="true" />
          {cols.slice(1).map((c) => <th key={c} scope="col" className="usage-num">{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <th scope="row">{r.label}</th>
            <td className="usage-track" aria-hidden="true"><span className="usage-bar" style={{ width: `${(r.visits / full) * 100}%` }} /></td>
            <td className="usage-num">{num(r.visits)}</td>
            {r.hits !== undefined && <td className="usage-num muted">{num(r.hits)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
