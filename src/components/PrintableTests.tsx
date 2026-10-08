// A class's two test forms on paper, for a lesson without devices or a backup when the network fails: every
// question of form A and form B with a line for the answer, then an answer key for each. The forms are the ones the
// students' browsers build (from the class code), so a paper answer can be typed in later as the same question.
// The browser's print dialog makes the PDF; on screen this is a preview with Print and Close.
import { useMemo } from "react";
import type { ClassSummary } from "../api";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";
import { latexToSvg } from "../math/latex";
import { areaOf, exercise, renderPractice, type PracticeWords } from "../math/practice";
import { svgToDataUrl } from "../math/svg";
import { testItems, type Form } from "../model/testForms";
import { SpokenMath } from "./SpokenMath";

export function PrintableTests({ klass, w, pw, onClose }: { klass: ClassSummary; w: Dict["teacher"]; pw: PracticeWords; onClose: () => void }) {
  const forms = useMemo(
    () =>
      (["A", "B"] as Form[]).map((form) => ({
        form,
        items: testItems(klass.code, klass.skills, form, klass.testLength).map((it) => {
          const ex = exercise(it.skill, it.level, it.seed, pw);
          const card = renderPractice({ area: areaOf(it.skill), skill: it.skill, level: it.level, seed: it.seed, count: 1, answers: false }, pw).svg;
          return { ex, card: svgToDataUrl(card), answer: svgToDataUrl(latexToSvg(ex.show).svg) };
        }),
      })),
    [klass, pw],
  );
  return (
    <div className="print-overlay" role="dialog" aria-modal="true" aria-label={w.printTests}>
      <div className="print-actions field-row">
        <button className="btn primary" onClick={() => window.print()}>🖨 {w.print}</button>
        <button className="btn" onClick={onClose}>{w.close}</button>
      </div>
      <div className="print-sheet">
        {forms.map(({ form, items }) => (
          <section key={form} className="print-page" data-form={form}>
            <h1>{fill(w.printTitle, { name: klass.name, form })}</h1>
            <p className="print-meta">
              {w.printStudent}: <span className="print-blank" />
            </p>
            <p className="print-note">{w.printNote}</p>
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
        {forms.map(({ form, items }) => (
          <section key={`key-${form}`} className="print-page print-key" data-key={form}>
            <h2>{fill(w.printKey, { form })}</h2>
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
    </div>
  );
}
