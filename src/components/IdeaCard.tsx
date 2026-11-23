// Idea cards (#579): an idea's four corners on one card (src/model/ideaCards.ts), the topic page's section of its
// ideas' cards under the intro, and the covered corner a spaced review opens with. Every corner is picked by a tap or
// the keyboard, never typed, and the pick counts for nothing.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";
import type { IdeaNode } from "../model/conceptGraph";
import { CORNERS, IDEA_CARDS, type Corner, type Covered } from "../model/ideaCards";

/** The words of a corner as a choice shows it: the glyph, the essence, the look-alike's name, the failure. */
export const cornerText = (t: Dict, idea: IdeaNode, corner: Corner): string =>
  corner === "glyph" ? IDEA_CARDS[idea].glyph : t.cards.ideas[idea][corner];

/** One idea's card: its name, then the four corners; `covered` hides one behind a question mark. */
export function IdeaCardView({ idea, covered, headingLevel = 3 }: { idea: IdeaNode; covered?: Corner; headingLevel?: 3 | 4 }) {
  const { t } = useI18n();
  const c = t.cards;
  const card = IDEA_CARDS[idea];
  const words = c.ideas[idea];
  const H = headingLevel === 3 ? "h3" : "h4";
  const body: Record<Corner, ReactNode> = {
    glyph: <span className="ic-glyph">{card.glyph}</span>,
    essence: <p>{words.essence}</p>,
    like: (
      <>
        <p className="ic-like">
          {card.like && <span className="ic-like-glyph" aria-hidden="true">{IDEA_CARDS[card.like].glyph}</span>}
          <strong>{words.like}</strong>
        </p>
        <p>{words.test}</p>
      </>
    ),
    failure: <p>{words.failure}</p>,
  };
  return (
    <article className="idea-card" aria-labelledby={`ic-${idea}`}>
      <H id={`ic-${idea}`} className="ic-name">{t.pracWords.ideas[idea]}</H>
      <div className="ic-corners">
        {CORNERS.map((k) => (
          <section key={k} className={`ic-corner ic-${k}${k === covered ? " covered" : ""}`} aria-label={c.corners[k]}>
            <span className="ic-label">{c.corners[k]}</span>
            {k === covered ? <span className="ic-hidden"><span aria-hidden="true">?</span><span className="sr-only">{c.covered}</span></span> : body[k]}
          </section>
        ))}
      </div>
    </article>
  );
}

/** The topic page's cards (#579): a sign for each of the topic's ideas to choose, and the chosen idea's card. */
export function IdeaCards({ ideas }: { ideas: readonly IdeaNode[] }) {
  const { t } = useI18n();
  const c = t.cards;
  const [on, setOn] = useState<IdeaNode>(ideas[0]);
  return (
    <section className="site-section idea-cards" aria-labelledby="topic-cards">
      <h2 id="topic-cards">{c.title}</h2>
      <p className="course-count">{c.lede}</p>
      <div className="ic-picks" role="group" aria-label={c.pick}>
        {ideas.map((id) => (
          <button key={id} type="button" className={`ic-pick${id === on ? " on" : ""}`} aria-pressed={id === on} aria-label={t.pracWords.ideas[id]} title={t.pracWords.ideas[id]} onClick={() => setOn(id)}>
            {IDEA_CARDS[id].glyph}
          </button>
        ))}
      </div>
      <IdeaCardView idea={on} />
    </section>
  );
}

/**
 * The card a spaced review opens with: one corner covered, three choices to fill it. A pick shows the corner, right or
 * not, and the student goes on to the review. Nothing is counted.
 */
export function IdeaCardReview({ covered, onDone }: { covered: Covered; onDone: () => void }) {
  const { t } = useI18n();
  const c = t.cards;
  const { idea, corner, choices } = covered;
  const [picked, setPicked] = useState<IdeaNode | null>(null);
  const first = useRef<HTMLButtonElement>(null);
  const goOn = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  useEffect(() => {
    if (picked) goOn.current?.focus();
  }, [picked]);
  return (
    <div className="ic-review" role="region" aria-label={c.reviewHead}>
      <strong className="ic-review-head">{c.reviewHead}</strong>
      <IdeaCardView idea={idea} covered={picked ? undefined : corner} headingLevel={4} />
      <p className="ic-ask">{fill(c.reviewAsk, { corner: c.corners[corner] })}</p>
      <div className={`ic-choices ic-choices-${corner}`} role="group" aria-label={c.corners[corner]}>
        {choices.map((id, i) => (
          <button
            key={id}
            ref={i === 0 ? first : undefined}
            type="button"
            className={`btn ic-choice${picked && id === idea ? " right" : ""}${picked === id && id !== idea ? " wrong" : ""}`}
            disabled={!!picked}
            onClick={() => setPicked(id)}
          >
            {cornerText(t, id, corner)}
          </button>
        ))}
      </div>
      {picked && (
        <>
          <div className={`practice-verdict ${picked === idea ? "ok" : "close"}`} role="status">
            {picked === idea ? `✓ ${c.right}` : c.wrong}
          </div>
          <div className="field-row practice-actions">
            <button ref={goOn} type="button" className="btn primary" onClick={onDone}>{c.goOn} →</button>
          </div>
        </>
      )}
    </div>
  );
}
