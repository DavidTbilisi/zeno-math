// The teacher's games (server/classGames.ts): the games picked for the class from the Games menu, and for each student
// the stars won on each, sent by their browser, with the ones passed (two stars or more on every puzzle) ticked. Games
// open as homework does, so until then the card says why and the picker is off; taking the games off always works.
import { useState } from "react";
import { studentName, type ClassSummary, type Dashboard, type teacherApi } from "../api";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";
import { isLiveEntry, MENUS } from "../menus";
import { GAME_KEYS, ladderDone, type GameId } from "../model/gameKeys";
import { gameName } from "../roadWords";

/** The Games menu's sections, with only the games that have a ladder (an assignable game). */
export const GAME_SECTIONS = MENUS.filter((g) => g.label === "gamesMenu").flatMap((g) => g.sections).map((sec) => ({
  title: sec.title,
  games: sec.items.filter(isLiveEntry).filter((e) => Object.hasOwn(GAME_KEYS, e.live)).map((e) => ({ game: e.live as GameId, icon: e.icon })),
})).filter((sec) => sec.games.length);
const ICONS = new Map(GAME_SECTIONS.flatMap((s) => s.games.map((g) => [g.game, g.icon] as const)));
export const gameIcon = (g: GameId) => ICONS.get(g) ?? "🎮";

export function GamesCard({ klass, data, api, t, showCodes, onChanged }: {
  klass: ClassSummary;
  data: Dashboard;
  api: ReturnType<typeof teacherApi>;
  t: Dict;
  showCodes: boolean;
  onChanged: () => void;
}) {
  const tw = t.site.teach;
  const { assigned, open, stars } = data.games;
  const [picked, setPicked] = useState<GameId[]>(assigned);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const changed = picked.length !== assigned.length || picked.some((g, i) => g !== assigned[i]);

  const save = async (games: GameId[]) => {
    setBusy(true);
    setFailed(false);
    try {
      setPicked((await api.games(klass.code, games)).games);
      onChanged();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  const toggle = (g: GameId, on: boolean) => setPicked(on ? [...picked, g] : picked.filter((x) => x !== g));
  const starsOf = (student: string, g: GameId) => stars[student]?.[g]?.stars ?? [];

  return (
    <section className="card games-card" aria-labelledby="games-title">
      <h3 id="games-title">{tw.games}</h3>
      <p className="hint">{tw.gamesHint}</p>
      {!open && <p className="hint">{tw.gamesLocked}</p>}
      {(open || assigned.length > 0) && (
        <details className="games-pick">
          <summary>{fill(tw.gamesChosen, { n: picked.length })}</summary>
          {GAME_SECTIONS.map((sec) => (
            <fieldset key={sec.title ?? ""} disabled={busy || !open}>
              {sec.title && <legend>{t[sec.title]}</legend>}
              {sec.games.map(({ game, icon }) => (
                <label key={game} className="check inline">
                  <input type="checkbox" checked={picked.includes(game)} onChange={(e) => toggle(game, e.target.checked)} />
                  <span>{icon} {gameName(t, game)}</span>
                </label>
              ))}
            </fieldset>
          ))}
        </details>
      )}
      <div className="field-row wrap games-save">
        {open && changed && <button className="btn primary small" disabled={busy} onClick={() => void save(picked)}>{tw.gamesSave}</button>}
        {assigned.length > 0 && <button className="btn small" disabled={busy} onClick={() => void save([])}>{tw.gamesClear}</button>}
      </div>
      {failed && <p className="error" role="alert">{tw.gamesFailed}</p>}
      {assigned.length > 0 && (
        !data.students.length ? <p className="muted">{t.teacher.noStudents}</p> : (
          <div className="heat-wrap">
            <table className="data-table games-table">
              <thead>
                <tr>
                  <th scope="col">{tw.gamesStudent}</th>
                  {assigned.map((g) => <th key={g} scope="col" title={gameName(t, g)}><span aria-hidden="true">{gameIcon(g)}</span><span className="sr-only">{gameName(t, g)}</span></th>)}
                  <th scope="col">{tw.gamesPassed}</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => {
                  const done = assigned.filter((g) => ladderDone(starsOf(s.id, g))).length;
                  return (
                    <tr key={s.id}>
                      <th scope="row">{studentName(s.id, s.number, showCodes ? s.code : undefined)}</th>
                      {assigned.map((g) => {
                        const st = starsOf(s.id, g);
                        const won = st.reduce((a, b) => a + b, 0);
                        const label = ladderDone(st) ? tw.gamePassed : won ? fill(tw.gameStars, { n: won, of: 3 * st.length }) : tw.gameNotYet;
                        return (
                          <td key={g} className={ladderDone(st) ? "game-passed" : won ? "game-played" : "game-none"} title={`${gameName(t, g)}: ${label}`}>
                            {ladderDone(st) ? "✓" : won ? `${won}★` : "–"}
                          </td>
                        );
                      })}
                      <td>{fill(tw.goalCount, { done, total: assigned.length })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}
