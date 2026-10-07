// Mastery by skill: one row per student, grouped by condition with the group's average on top, one column per skill.
// A cell's shade is the chance of a right first answer at medium level, in five 20 % bins of one blue (darker = more in
// light mode, lighter = more in dark mode); grey means no answers on the skill yet. Hovering a cell gives all three
// levels; "show numbers" puts the percentages in the cells, so nothing depends on colour or hover alone.
import type { Dashboard } from "../api";
import { fill } from "../math/chart";
import type { SkillId } from "../math/practiceSkills";
import { useChartTip } from "./ChartTip";

type Words = {
  student: string; answeredShort: string; groupMean: string; noAnswers: string; cellTip: string; adaptive: string; fixed: string;
};
type Cell = { p: number[]; n: number } | null;

const bin = (p: number) => Math.min(4, Math.floor(p * 5));

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

  const cell = (who: string, k: SkillId, c: Cell, key: string) => {
    const tip = () =>
      c
        ? { value: pct(c.p[1]), label: `${who} · ${skillName(k)}`, detail: fill(words.cellTip, { p1: pct(c.p[0]), p2: pct(c.p[1]), p3: pct(c.p[2]), n: c.n }) }
        : { value: "—", label: `${who} · ${skillName(k)}`, detail: words.noAnswers };
    return (
      <td key={key} className={`heat-cell ${c ? `heat-${bin(c.p[1])}` : "heat-none"}`} {...bind(tip)}>
        {showNumbers && c ? Math.round(c.p[1] * 100) : ""}
      </td>
    );
  };

  const groups = (["adaptive", "fixed"] as const)
    .map((condition) => ({ condition, students: data.students.filter((s) => s.condition === condition) }))
    .filter((g) => g.students.length);

  return (
    <div className="heat-wrap">
      <table className="heat">
        <thead>
          <tr>
            <th className="heat-name">{words.student}</th>
            <th className="heat-num">{words.answeredShort}</th>
            {skills.map((k) => (
              <th key={k} className="heat-skill" scope="col"><span>{skillName(k)}</span></th>
            ))}
          </tr>
        </thead>
        {groups.map(({ condition, students }) => {
          const label = condition === "adaptive" ? words.adaptive : words.fixed;
          // The group's average over the students who have answered on the skill.
          const mean = (k: SkillId): Cell => {
            const seen = students.map((s) => s.mastery[k]).filter((m) => m.n > 0);
            if (!seen.length) return null;
            const avg = (i: number) => seen.reduce((sum, m) => sum + m.p[i], 0) / seen.length;
            return { p: [avg(0), avg(1), avg(2)], n: seen.reduce((sum, m) => sum + m.n, 0) };
          };
          return (
            <tbody key={condition}>
              <tr className="heat-group">
                <th className="heat-name" scope="rowgroup">{label} ({students.length})</th>
                <td className="heat-num">{students.reduce((s, x) => s + x.answered, 0)}</td>
                {skills.map((k) => cell(`${label} · ${words.groupMean}`, k, mean(k), k))}
              </tr>
              {students.map((s) => {
                const who = showCodes ? `${s.id} · ${s.code}` : s.id;
                return (
                  <tr key={s.id}>
                    <th className="heat-name mono" scope="row">{who}</th>
                    <td className="heat-num">{s.answered}</td>
                    {skills.map((k) => cell(who, k, s.mastery[k].n > 0 ? s.mastery[k] : null, k))}
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

/** The scale: five bins and "no answers yet". */
export function HeatLegend({ pct, noAnswers }: { pct: (x: number) => string; noAnswers: string }) {
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
    </div>
  );
}
