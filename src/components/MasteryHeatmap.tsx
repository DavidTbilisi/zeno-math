// Mastery by skill: one row per student, grouped by arm with the arm's average on top, one column per skill, after the
// student's answers so far and their test scores (in brackets while a test is unfinished). The arm's test average
// counts every student of it, a test not sat as 0, as the tests card does (intention to treat).
// A cell's shade is the chance of a right first answer at medium level, in five 20 % bins of one blue (darker = more in
// light mode, lighter = more in dark mode); grey means no answers on the skill yet. Hovering a cell gives all three
// levels; "show numbers" puts the percentages in the cells, so nothing depends on colour or hover alone. A mark says
// how a mastered skill holds (issue #264, spacing.ts): ✓ mastered in practice, ★ kept (right on a review days later),
// ↺ wrong on its review and practised again.
import type { Dashboard } from "../api";
import { fill } from "../math/text";
import type { SkillId } from "../math/practiceSkills";
import { ARMS } from "../model/arms";
import type { Hold } from "../model/spacing";
import { useChartTip } from "./ChartTip";

type Words = {
  student: string; answeredShort: string; groupMean: string; noAnswers: string; cellTip: string;
  pre: string; post: string; delayed: string; holds: Record<Hold, string>;
  features: Record<Dashboard["class"]["feature"], { on: string; off: string }>;
};
type Score = { score: number; complete: boolean } | null;
type Cell = { p: number[]; n: number } | null;

const bin = (p: number) => Math.min(4, Math.floor(p * 5));
/** The mark of how a mastered skill holds. */
export const HOLD_MARK: Record<Hold, string> = { mastered: "✓", kept: "★", again: "↺" };

export function MasteryHeatmap({ data, words, skillName, pct, showNumbers, showCodes }: {
  data: Dashboard;
  words: Words;
  skillName: (k: SkillId) => string;
  pct: (x: number) => string;
  showNumbers: boolean;
  showCodes: boolean;
}) {
  const { bind, view } = useChartTip();
  const skills = data.class.skills;

  const cell = (who: string, k: SkillId, c: Cell, key: string, hold?: Hold) => {
    const detail = (d: string) => (hold ? `${d} · ${HOLD_MARK[hold]} ${words.holds[hold]}` : d);
    const tip = () =>
      c
        ? { value: pct(c.p[1]), label: `${who} · ${skillName(k)}`, detail: detail(fill(words.cellTip, { p1: pct(c.p[0]), p2: pct(c.p[1]), p3: pct(c.p[2]), n: c.n })) }
        : { value: "—", label: `${who} · ${skillName(k)}`, detail: words.noAnswers };
    return (
      <td key={key} className={`heat-cell ${c ? `heat-${bin(c.p[1])}` : "heat-none"}${hold ? ` heat-${hold}` : ""}`} {...bind(tip)}>
        {showNumbers && c ? Math.round(c.p[1] * 100) : ""}
        {hold && <span className={`heat-hold${showNumbers && c ? " beside" : ""}`} aria-label={words.holds[hold]}>{HOLD_MARK[hold]}</span>}
      </td>
    );
  };

  const score = (t: Score) => (!t ? "—" : t.complete ? pct(t.score) : `(${pct(t.score)})`);
  const meanScore = (ts: Score[]) => (ts.some(Boolean) ? pct(ts.reduce((a, t) => a + (t?.score ?? 0), 0) / ts.length) : "—");
  const groups = ARMS
    .map((arm) => ({ arm, students: data.students.filter((s) => s.arm === arm) }))
    .filter((g) => g.students.length);
  const tests = ["pre", "post", "delayed"] as const;

  return (
    <div className="heat-wrap">
      <table className="heat">
        <thead>
          <tr>
            <th className="heat-name">{words.student}</th>
            <th className="heat-num">{words.answeredShort}</th>
            {tests.map((t) => <th key={t} className="heat-num">{words[t]}</th>)}
            {skills.map((k) => (
              <th key={k} className="heat-skill" scope="col"><span>{skillName(k)}</span></th>
            ))}
          </tr>
        </thead>
        {groups.map(({ arm, students }) => {
          const label = words.features[data.class.feature][arm];
          // The group's average over the students who have answered on the skill.
          const mean = (k: SkillId): Cell => {
            const seen = students.map((s) => s.mastery[k]).filter((m) => m.n > 0);
            if (!seen.length) return null;
            const avg = (i: number) => seen.reduce((sum, m) => sum + m.p[i], 0) / seen.length;
            return { p: [avg(0), avg(1), avg(2)], n: seen.reduce((sum, m) => sum + m.n, 0) };
          };
          return (
            <tbody key={arm}>
              <tr className="heat-group">
                <th className="heat-name" scope="rowgroup">{label} ({students.length})</th>
                <td className="heat-num">{students.reduce((s, x) => s + x.answered, 0)}</td>
                {tests.map((t) => <td key={t} className="heat-num">{meanScore(students.map((x) => x[t]))}</td>)}
                {skills.map((k) => cell(`${label} · ${words.groupMean}`, k, mean(k), k))}
              </tr>
              {students.map((s) => {
                const who = showCodes ? `${s.id} · ${s.code}` : s.id;
                return (
                  <tr key={s.id}>
                    <th className="heat-name mono" scope="row">{who}</th>
                    <td className="heat-num">{s.answered}</td>
                    {tests.map((t) => <td key={t} className="heat-num">{score(s[t])}</td>)}
                    {skills.map((k) => cell(who, k, s.mastery[k].n > 0 ? s.mastery[k] : null, k, s.holds[k]))}
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
      {view}
    </div>
  );
}

/** The scale: five bins and "no answers yet", then the marks of how a mastered skill holds. */
export function HeatLegend({ pct, noAnswers, holds }: { pct: (x: number) => string; noAnswers: string; holds: Record<Hold, string> }) {
  return (
    <div className="heat-legend">
      {[0, 1, 2, 3, 4].map((b) => (
        <span key={b} className="heat-legend-item">
          <i className={`heat-${b}`} />
          {pct(b / 5)}–{pct((b + 1) / 5)}
        </span>
      ))}
      <span className="heat-legend-item">
        <i className="heat-none" />
        {noAnswers}
      </span>
      {(["mastered", "kept", "again"] as const).map((h) => (
        <span key={h} className="heat-legend-item">
          <b className="heat-hold">{HOLD_MARK[h]}</b>
          {holds[h]}
        </span>
      ))}
    </div>
  );
}
