// The course map (#/course): the way from counting to a trained network in eight stages, each with its graded skills
// and how far the learner has come on them (from free practice in this browser), a tool to explore it and a lab to
// try. "Next" is the lowest-grade level whose prerequisites are met; a tool or lab opens on the stage's own board.
import { useState } from "react";
import { api } from "../api";
import { BrandBar } from "../components/BrandBar";
import { gradeName } from "../components/GradeCard";
import { useI18n } from "../i18n";
import type { Dict } from "../locales/en";
import type { LiveKind } from "../math/live";
import type { SkillId } from "../math/practiceSkills";
import { fill } from "../math/text";
import { isExtra, nextStep, STAGES, stageProgress, standing, type Stage, type StageId, type Standing } from "../model/course";
import { gradeOf, GRADES, PREREQUISITES, type Grade } from "../model/curriculum";
import { loadProgress } from "../practiceProgress";
import type { ToolKind } from "../tools";

type Explore = { tool: { kind: ToolKind; start?: string; label: (t: Dict) => string }; lab: { kind: LiveKind; label: (t: Dict) => string } };
// One board tool and one live piece for each stage.
const EXPLORE: Record<StageId, Explore> = {
  number: { tool: { kind: "model", label: (t) => t.models }, lab: { kind: "fractionWall", label: (t) => t.shapes.names.liveFractionWall } },
  algebra: { tool: { kind: "algebra", label: (t) => t.algebra }, lab: { kind: "balance", label: (t) => t.shapes.names.liveBalance } },
  calculus: { tool: { kind: "deriv", label: (t) => t.deriv }, lab: { kind: "graph", label: (t) => t.shapes.names.liveGraph } },
  linear: { tool: { kind: "matrix", start: "transform", label: (t) => t.matrices }, lab: { kind: "pcaLab", label: (t) => t.shapes.names.livePcaLab } },
  probability: { tool: { kind: "randvar", label: (t) => t.randvar }, lab: { kind: "chance", label: (t) => t.shapes.names.liveChance } },
  optimisation: { tool: { kind: "multivar", start: "gradient", label: (t) => t.multivar }, lab: { kind: "descentLab", label: (t) => t.shapes.names.liveDescentLab } },
  classical: { tool: { kind: "statistics", start: "scatter", label: (t) => t.statistics }, lab: { kind: "fitLab", label: (t) => t.shapes.names.liveFitLab } },
  deep: { tool: { kind: "ai", start: "softmax", label: (t) => t.aiSoftmax }, lab: { kind: "backpropLab", label: (t) => t.shapes.names.liveBackpropLab } },
};

// Each stage's board, made the first time one of its tools is opened, is kept for this browser.
const BOARDS_KEY = "zeno.course.boards";
function storedBoards(): Partial<Record<StageId, string>> {
  try {
    return JSON.parse(localStorage.getItem(BOARDS_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}
function storeBoard(stage: StageId, id: string) {
  try {
    localStorage.setItem(BOARDS_KEY, JSON.stringify({ ...storedBoards(), [stage]: id }));
  } catch {
    /* storage unavailable: the next tool opens a new board */
  }
}

const LEVELS = [1, 2, 3] as const;
/** The grades a stage's levels span, by their rungs: "1–10", "9–Uni", "Uni". */
function gradeSpan(stage: Stage, uniShort: string): string {
  const gs = stage.skills.flatMap((k) => LEVELS.map((L) => gradeOf(k, L))).filter((g): g is Grade => g !== null);
  const [lo, hi] = [GRADES.find((g) => gs.includes(g))!, [...GRADES].reverse().find((g) => gs.includes(g))!];
  const rung = (g: Grade, end: "lo" | "hi") => (g === 13 ? uniShort : g === 10 || g === 12 ? String(end === "lo" ? g - 1 : g) : String(g));
  return lo === hi ? rung(lo, "lo") : `${rung(lo, "lo")}–${rung(hi, "hi")}`;
}

export function CoursePage() {
  const { t } = useI18n();
  const c = t.course;
  const names = t.pracWords.skills;
  const [progress] = useState(loadProgress);
  const s = standing(progress.cells ?? {}, progress.placed ?? null);
  const next = nextStep(s);
  const known = !!(progress.placed || progress.cells);
  const [opening, setOpening] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const openOnBoard = async (stage: StageId, path: string) => {
    setOpening(path);
    setFailed(false);
    try {
      let id = storedBoards()[stage];
      if (id) await api.get(id).catch(() => (id = undefined));
      if (!id) {
        id = (await api.create(fill(c.board, { stage: c.stages[stage] }))).id;
        storeBoard(stage, id);
      }
      location.hash = `#/b/${id}/${path}`;
    } catch {
      setFailed(true);
      setOpening(null);
    }
  };

  return (
    <div className="z">
      <BrandBar>
        <a href="#/practice">{t.practice}</a>
        <a href="#/">{t.myBoards}</a>
      </BrandBar>
      <div className="z-page course-page">
        <h1 className="z-page-title">{c.title}</h1>
        <p className="course-lede">{c.lede}</p>

        <section className="course-next" aria-label={c.next}>
          {next ? (
            <>
              <div className="course-next-text">
                <span>{c.next}</span>
                <strong>{fill(c.nextLine, { skill: names[next.skill], level: next.level })}</strong>
                <span className="course-next-where">
                  {c.stages[STAGES.find((st) => st.skills.includes(next.skill))!.id]}, {gradeName(gradeOf(next.skill, next.level)!, t.pracWords.grades)}
                </span>
                {!known && <a href="#/practice">{c.findGrade}</a>}
              </div>
              <a className="z-btn z-btn-marker" href={`#/practice/${next.skill}.${next.level}`}>{c.practise}</a>
            </>
          ) : (
            <p className="course-next-text"><strong>{c.allDone}</strong></p>
          )}
        </section>

        {failed && <p className="error" role="alert">{c.failed}</p>}
        <p className="course-legend" aria-hidden="true">
          {(["secure", "behind", "open"] as const).map((k) => <span key={k}><i className={`pip ${k}`} />{c.legend[k]}</span>)}
        </p>

        <ol className="course-stages">
          {STAGES.map((stage, i) => {
            const p = stageProgress(stage, s);
            const here = !!next && stage.skills.includes(next.skill);
            const ex = EXPLORE[stage.id];
            return (
              <li key={stage.id} className={`course-stage${here ? " here" : ""}`}>
                <span className="course-stage-n" aria-hidden="true">{i + 1}</span>
                <div className="course-stage-body">
                  <div className="course-stage-head">
                    <h2>{c.stages[stage.id]}</h2>
                    <span className="course-grades">{c.grades} {gradeSpan(stage, t.pracWords.grades.uniShort)}</span>
                  </div>
                  <p className="course-about">{c.about[stage.id]}</p>
                  <div className="course-track" aria-hidden="true">
                    <span className="secure" style={{ width: `${(100 * p.secure) / p.total}%` }} />
                    <span className="behind" style={{ width: `${(100 * p.behind) / p.total}%` }} />
                  </div>
                  <p className="course-count">{fill(c.levels, p)}</p>
                  <ul className="course-skills">
                    {stage.skills.map((k) => <SkillChip key={k} skill={k} s={s} next={next?.skill === k} names={names} c={c} />)}
                  </ul>
                  <div className="course-tools">
                    <span>{c.explore}</span>
                    <button className="z-btn z-btn-line" disabled={!!opening} onClick={() => openOnBoard(stage.id, `tool/${ex.tool.kind}${ex.tool.start ? `/${ex.tool.start}` : ""}`)}>
                      {ex.tool.label(t)}
                    </button>
                    <span>{c.lab}</span>
                    <button className="z-btn z-btn-line" disabled={!!opening} onClick={() => openOnBoard(stage.id, `live/${ex.lab.kind}`)}>
                      {ex.lab.label(t)}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function SkillChip({ skill, s, next, names, c }: { skill: SkillId; s: Standing; next: boolean; names: Dict["pracWords"]["skills"]; c: Dict["course"] }) {
  const states = LEVELS.map((L) => s.level(skill, L));
  const graded = LEVELS.filter((L) => isExtra(skill) || gradeOf(skill, L) !== null);
  const done = graded.every((L) => states[L - 1] !== "open");
  // Waiting: its first level still to do has a prerequisite not yet secure or behind.
  const first = graded.find((L) => states[L - 1] === "open");
  const waiting = !!first && !isExtra(skill) && !s.ready(skill, first);
  const label = [names[skill], isExtra(skill) ? c.extra : "", ...LEVELS.map((L, i) => `${L}: ${c.legend[states[i]]}`)].filter(Boolean).join(", ");
  return (
    <li>
      <a
        className={`course-skill${done ? " done" : ""}${waiting ? " waiting" : ""}${next ? " next" : ""}`}
        href={`#/practice/${skill}.${first ?? 1}`}
        aria-label={label}
        title={waiting ? fill(c.waits, { skills: (PREREQUISITES[skill] ?? []).map((k) => names[k]).join(", ") }) : undefined}
      >
        <span>{names[skill]}</span>
        <span className="pips" aria-hidden="true">{states.map((st, i) => <i key={i} className={`pip ${st}`} />)}</span>
      </a>
    </li>
  );
}
