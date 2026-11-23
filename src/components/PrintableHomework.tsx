// Each student's homework on paper (issue #297), for students without a device: one page per student with their own
// questions and a line for each answer, then an answer key per student for the teacher. The questions are the ones the
// student's browser would ask (rebuilt from skill, level and seed). The browser's print dialog makes the PDF; on screen
// it is a page of its own (#562) with Print and Back, as for the tests (PrintableTests).
import { useMemo } from "react";
import type { ClassSummary, Dashboard } from "../api";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";
import { latexToSvg } from "../math/latex";
import { areaOf, exercise, renderPractice, type PracticeWords } from "../math/practice";
import { svgToDataUrl } from "../math/svg";
import { SpokenMath } from "./SpokenMath";

export function PrintableHomework({ klass, rows, nameOf, w, pw, back }: {
  klass: ClassSummary;
  rows: Dashboard["homework"]["rows"];
  /** How a student is named on their sheet: their number in the class list, else their number in the study. */
  nameOf: (id: string) => string;
  w: Dict["teacher"];
  pw: PracticeWords;
  /** Where its Back link goes (the browser's Back does the same). */
  back: string;
}) {
  const sheets = useMemo(
    () =>
      rows.map((r) => ({
        student: r.student,
        items: r.items.map((it) => {
          const ex = exercise(it.skill, it.level, it.seed, pw);
          const card = renderPractice({ area: areaOf(it.skill), skill: it.skill, level: it.level, seed: it.seed, count: 1, answers: false }, pw).svg;
          return { ex, card: svgToDataUrl(card), answer: svgToDataUrl(latexToSvg(ex.show).svg) };
        }),
      })),
    [rows, pw],
  );
  return (
    <main className="print-view" aria-label={w.homeworkPrint}>
      <div className="print-actions field-row">
        <button className="btn primary" onClick={() => window.print()}>🖨 {w.print}</button>
        <a className="btn" href={back}>{w.close}</a>
      </div>
      <div className="print-sheet">
        {sheets.map(({ student, items }) => (
          <section key={student} className="print-page" data-student={student}>
            <h1>{fill(w.homeworkPrintTitle, { name: klass.name, student: nameOf(student) })}</h1>
            <p className="print-note">{w.homeworkPrintNote}</p>
            <ol className="print-items">
              {items.map(({ ex, card }, i) => (
                <li key={i}>
                  <img src={card} alt="" />
                  <SpokenMath text={ex.prompt} tex={ex.q} />
                  <div className="print-line" />
                </li>
              ))}
            </ol>
          </section>
        ))}
        {sheets.map(({ student, items }) => (
          <section key={`key-${student}`} className="print-page print-key" data-key={student}>
            <h2>{fill(w.homeworkPrintKey, { student: nameOf(student) })}</h2>
            <ol>
              {items.map(({ ex, answer }, i) => (
                <li key={i}>
                  <img src={answer} alt={ex.plain} />
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}
