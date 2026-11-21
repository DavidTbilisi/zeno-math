// A topic's intro (#450) at the top of its page: what it is beside its picture, then four places it turns up in everyday
// life. Once most of it has been on screen for READ_MS it counts as read ("read:<topic>" in achieved.ts), which ticks
// the "What is…?" item on the roadmaps that start a stage with it.
import { useEffect, useRef, useState } from "react";
import { loadAchieved, noteAchieved } from "../achieved";
import { useI18n } from "../i18n";
import { EXPLAINERS } from "../model/explainers";
import type { TopicId } from "../model/topics";
import { TopicPicture } from "./TopicPicture";

/** How long the intro must stay in view to count as read: enough for its four short lines. */
export const READ_MS = 5000;
export const readKey = (id: TopicId) => `read:${id}`;

export function Explainer({ id }: { id: TopicId }) {
  const { t } = useI18n();
  const e = t.site.explain;
  const words = e.topics[id];
  const box = useRef<HTMLElement>(null);
  const [read, setRead] = useState(() => loadAchieved()[readKey(id)] !== undefined);

  useEffect(() => {
    const el = box.current;
    if (read || !el || typeof IntersectionObserver === "undefined") return;
    let timer: number | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.5 && timer === undefined)
          timer = window.setTimeout(() => {
            noteAchieved(readKey(id));
            setRead(true);
          }, READ_MS);
        else if (entry.intersectionRatio < 0.5 && timer !== undefined) {
          window.clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [id, read]);

  return (
    <section ref={box} className="site-section explainer" aria-labelledby="topic-what">
      <div className="explainer-what">
        <TopicPicture topic={id} />
        <div>
          <h2 id="topic-what">{words.q}</h2>
          <p>{words.what}</p>
          {read && <p className="explainer-read"><span aria-hidden="true">✓</span> {e.readDone}</p>}
        </div>
      </div>
      <h3 className="explainer-use-head">{e.useHead}</h3>
      <ul className="explainer-uses">
        {words.uses.map((u, n) => (
          <li key={n}><span className="explainer-icon" aria-hidden="true">{EXPLAINERS[id].uses[n]}</span><span>{u}</span></li>
        ))}
      </ul>
    </section>
  );
}
