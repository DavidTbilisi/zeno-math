// A lesson (#/l/<token>): two boards side by side, each written by its owner and followed by the other.
// The host (who started the lesson on their board) has their own board on the left and a guest's on the right, with a
// tab for each guest; a guest has the host's board on the left and their own, made for the lesson, on the right; a
// browser that can own no board just watches the host's. Each side is a page of its own in a frame (the board page, or
// a follower: #/lv/<token> for the host's board, #/lw/<token>/<board> for a guest's), so the two drawings share no
// keys, tools or state. "Hand out" copies the host's board into every guest's: the host only leaves a mark, and each
// guest's page, seeing it, has the guest's own board take the copy in (src/model/lessonCopy.ts), so a board is still
// written by its owner alone. A guest can take the copy at any time too.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ApiError, lessons, type LessonGuest, type LessonState } from "../api";
import { ZenoMark } from "../components/ZenoMark";
import { LangSelect, useI18n } from "../i18n";
import { FollowBoard } from "./SharedBoardPage";

/** How often a side asks for the other's board, and the page for who has joined and what was handed out. */
const FOLLOW_MS = 1000;
const STATE_MS = 3000;
/** Below this width the two boards don't fit side by side: one is shown, with tabs to change it. */
const NARROW = 760;
const SPLIT_KEY = "zeno.lesson.split";
export const lessonLink = (token: string) => `${location.origin}${location.pathname}#/l/${token}`;
const pane = (hash: string) => `${location.pathname}${hash}`;
const handoutKey = (token: string) => `zeno.lesson.handout.${token}`;

/** The message a guest's lesson page sends its own board (the frame beside it), and the board's answer. */
export type LessonCopy = { type: "zeno:lesson-copy"; id: string; elements: unknown[]; files: Record<string, unknown> };
export type LessonCopied = { type: "zeno:lesson-copied"; id: string };

/** The host's board, followed through the lesson's link. */
export function LessonHostPane({ token }: { token: string }) {
  const { t } = useI18n();
  return <FollowBoard from={`lesson ${token}`} every={FOLLOW_MS} source={(etag) => lessons.board(token, etag)} gone={t.lesson.gone} label={t.lesson.hostBoard} />;
}

/** One guest's board, followed by the host. */
export function LessonGuestPane({ token, board }: { token: string; board: string }) {
  const { t } = useI18n();
  return <FollowBoard from={`guest ${token} ${board}`} every={FOLLOW_MS} source={(etag) => lessons.guest(token, board, etag)} gone={t.lesson.gone} label={t.lesson.guestBoard} />;
}

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < NARROW);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < NARROW);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return narrow;
}

function readNumber(key: string): number | null {
  try {
    const v = localStorage.getItem(key);
    return v === null || !Number.isFinite(Number(v)) ? null : Number(v);
  } catch {
    return null;
  }
}
function writeNumber(key: string, v: number) {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    // no storage: it is asked again next time
  }
}

/** A button that copies the lesson's link and says so for a moment. */
function CopyLink({ token }: { token: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lessonLink(token));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no clipboard (an insecure page): the link is in the address bar
    }
  };
  return <button className="btn small" onClick={() => void copy()}>{copied ? `✓ ${t.shareCopied}` : t.lesson.copyLink}</button>;
}

export function LessonPage({ token }: { token: string }) {
  const { t } = useI18n();
  const w = t.lesson;
  const [state, setState] = useState<LessonState | null>(null);
  const [gone, setGone] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [split, setSplit] = useState(() => Math.max(20, Math.min(80, readNumber(SPLIT_KEY) ?? 50)));
  const [dragging, setDragging] = useState(false);
  const [side, setSide] = useState<"left" | "right">("right");
  const [note, setNote] = useState<string | null>(null);
  const narrow = useNarrow();
  const panes = useRef<HTMLDivElement>(null);
  const mine = useRef<HTMLIFrameElement>(null);

  // Coming in (a learner's board for the lesson is made here, once), then watching who has joined and what is handed out.
  useEffect(() => {
    let live = true;
    const take = (work: Promise<LessonState>) =>
      work.then(
        (s) => live && setState((prev) => (prev?.role === "guest" && s.role === "guest" && prev.made ? { ...s, made: true } : s)),
        (e) => live && e instanceof ApiError && e.status === 404 && setGone(true),
      );
    void take(lessons.enter(token));
    const timer = setInterval(() => !document.hidden && void take(lessons.state(token)), STATE_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [token]);

  const say = useCallback((text: string) => {
    setNote(text);
    setTimeout(() => setNote((now) => (now === text ? null : now)), 4000);
  }, []);

  // The host's board copied into this guest's own: the board in the frame does it, and is asked until it answers
  // (it may still be loading).
  const copyIn = useCallback(async () => {
    const got = await lessons.board(token).catch(() => null);
    const frame = mine.current?.contentWindow;
    if (!got || !frame) return;
    const message: LessonCopy = {
      type: "zeno:lesson-copy", id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      elements: [...(got.board.scene.elements ?? [])], files: got.board.scene.files ?? {},
    };
    let tries = 0;
    const done = (e: MessageEvent) => {
      const d = e.data as LessonCopied | undefined;
      if (e.origin !== location.origin || d?.type !== "zeno:lesson-copied" || d.id !== message.id) return;
      stop();
      say(w.copiedIn);
    };
    const send = () => (++tries > 40 ? stop() : mine.current?.contentWindow?.postMessage(message, location.origin));
    const timer = setInterval(send, 500);
    const stop = () => {
      clearInterval(timer);
      window.removeEventListener("message", done);
    };
    window.addEventListener("message", done);
    send();
  }, [token, say, w.copiedIn]);

  // A hand-out this browser has not taken yet is taken; a guest who came after it gets it with their new board.
  const handoutAt = state?.handoutAt ?? 0;
  const isGuest = state?.role === "guest";
  const made = state?.role === "guest" && !!state.made;
  useEffect(() => {
    if (!isGuest) return;
    const had = readNumber(handoutKey(token));
    if (had !== null ? handoutAt > had : made && handoutAt > 0) void copyIn();
    if (had !== handoutAt) writeNumber(handoutKey(token), handoutAt);
  }, [isGuest, made, handoutAt, token, copyIn]);

  const drag = (e: ReactPointerEvent) => {
    const box = panes.current?.getBoundingClientRect();
    if (!dragging || !box) return;
    setSplit(Math.max(20, Math.min(80, ((e.clientX - box.left) / box.width) * 100)));
  };
  const drop = () => {
    setDragging(false);
    writeNumber(SPLIT_KEY, Math.round(split));
  };

  if (gone) return <div className="z center-msg"><p>{w.gone}</p><a className="btn" href="#/boards">{t.back}</a></div>;
  if (!state) return <div className="z center-msg">{t.loading}</div>;

  const guestName = (g: LessonGuest, i: number) => g.name ?? (g.number !== null ? `#${g.number}` : w.guest.replace("{n}", String(i + 1)));
  const guests = state.role === "host" ? state.guests : [];
  const shown = guests.find((g) => g.board === picked) ?? guests[0];
  const handOut = async () => {
    try {
      await lessons.handOut(token);
      say(w.handedOut);
    } catch {
      // offline: the button can be pressed again
    }
  };

  const left =
    state.role === "host"
      ? <iframe key="own" title={w.myBoard} src={pane(`#/b/${state.board}`)} />
      : <iframe key="host" title={w.hostBoard} src={pane(`#/lv/${token}`)} />;
  const right =
    state.role === "guest" ? <iframe key="own" ref={mine} title={w.myBoard} src={pane(`#/b/${state.board}`)} />
    : state.role === "host" ? (
      shown
        ? <iframe key={shown.board} title={w.guestBoard} src={pane(`#/lw/${token}/${shown.board}`)} />
        : (
          <div className="lesson-empty">
            <p>{w.nobody}</p>
            <input className="mono" readOnly value={lessonLink(token)} aria-label={w.link} onFocus={(e) => e.target.select()} />
            <CopyLink token={token} />
          </div>
        )
    ) : null;
  const names = state.role === "host" ? [w.myBoard, w.guestBoard] : [w.hostBoard, w.myBoard];

  return (
    <div className="z lesson">
      <header className="lesson-bar">
        <a className="board-home" href="#/boards" title={t.back} aria-label={t.back}><ZenoMark size={14} /></a>
        <strong className="lesson-title">{state.title}</strong>
        <span className="lesson-tag">{w.tag}</span>
        {guests.length > 1 && (
          <div className="lesson-guests" role="tablist" aria-label={w.guestBoard}>
            {guests.map((g, i) => (
              <button key={g.board} role="tab" aria-selected={g.board === shown?.board} className={`btn small${g.board === shown?.board ? " on" : ""}`}
                onClick={() => setPicked(g.board)}>{guestName(g, i)}</button>
            ))}
          </div>
        )}
        {guests.length === 1 && <span className="lesson-who">{guestName(guests[0], 0)}</span>}
        <div className="spacer" />
        {note && <span className="lesson-note" role="status">{note}</span>}
        {state.role === "host" && <button className="btn small primary" disabled={!guests.length} title={w.handOutTitle} onClick={() => void handOut()}>{w.handOut}</button>}
        {state.role === "host" && <CopyLink token={token} />}
        {state.role === "guest" && <button className="btn small primary" title={w.copyInTitle} onClick={() => void copyIn()}>{w.copyIn}</button>}
        <LangSelect />
      </header>
      {state.role === "viewer" && (
        <p className="lesson-viewer">{w.viewer} <a href="#/account">{t.site.account.link}</a></p>
      )}
      {right && narrow && (
        <div className="lesson-sides" role="tablist" aria-label={w.sides}>
          {(["left", "right"] as const).map((s, i) => (
            <button key={s} role="tab" aria-selected={side === s} className={`btn small${side === s ? " on" : ""}`} onClick={() => setSide(s)}>{names[i]}</button>
          ))}
        </div>
      )}
      <div ref={panes} className={`lesson-panes${dragging ? " dragging" : ""}`} onPointerMove={drag} onPointerUp={drop} onPointerCancel={drop}>
        <div className="lesson-pane" style={right ? (narrow ? { display: side === "left" ? undefined : "none", flex: 1 } : { flexBasis: `${split}%` }) : { flex: 1 }}>{left}</div>
        {right && !narrow && (
          <div className="lesson-divider" role="separator" aria-orientation="vertical" aria-label={w.divider} title={w.divider}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(true);
            }} />
        )}
        {right && <div className="lesson-pane" style={narrow ? { display: side === "right" ? undefined : "none", flex: 1 } : { flex: 1 }}>{right}</div>}
      </div>
    </div>
  );
}
