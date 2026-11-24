// A board seen through its read-only link (#/s/<token>): Excalidraw in view mode, with live pieces shown as they
// were left, following the board as its owner saves (it asks again every few seconds and redraws when it changed).
// The same follower shows the other side's board in a lesson (LessonPage.tsx), asking more often.
import { useEffect, useMemo, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import { installPaper, isPaper } from "../paper";
import type { AppState, BinaryFileData, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { api, ApiError, type Followed, type SharedBoard } from "../api";
import { ZenoMark } from "../components/ZenoMark";
import { LangSelect, useI18n } from "../i18n";
import { isLiveLink, liveDataOf } from "../live/element";
import { LiveView, type LiveHost } from "../live/LiveView";

const FOLLOW_MS = 5000;
// Pieces can't be changed here: the host takes nothing back.
const READ_ONLY: LiveHost = { update: () => {}, snapshot: () => {}, freezeGraph: () => {} };

export function SharedBoardPage({ token }: { token: string }) {
  const { t } = useI18n();
  return <FollowBoard from={`shared ${token}`} source={(etag) => api.shared(token, etag)} gone={t.sharedGone} />;
}

/**
 * A board followed as it is saved: `source` is asked every `every` ms (not while the page is hidden) with the etag
 * of the copy in hand. `from` names what is followed, so another board starts afresh; `gone` is said once it answers
 * 404; `label` stands in the bar where a read-only link says "Read-only".
 */
export function FollowBoard({ from, source, every = FOLLOW_MS, gone: goneText, label }: {
  from: string; source: (etag?: string) => Promise<Followed>; every?: number; gone: string; label?: string;
}) {
  const { t } = useI18n();
  const ask = useRef(source);
  ask.current = source;
  const [board, setBoard] = useState<SharedBoard | null>(null);
  const [gone, setGone] = useState(false);
  const excalidraw = useRef<ExcalidrawImperativeAPI | null>(null);
  const seen = useRef(-1);
  const etag = useRef<string | undefined>(undefined);

  useEffect(() => {
    let live = true;
    const follow = async () => {
      try {
        // With the last answer's ETag sent along, the server sends the scene again only once it has changed.
        if (document.hidden && seen.current >= 0) return;
        const got = await ask.current(etag.current);
        if (!live || !got) return;
        const b = got.board;
        etag.current = got.etag || undefined;
        if (b.updatedAt === seen.current) return;
        const first = seen.current < 0;
        seen.current = b.updatedAt;
        const ex = excalidraw.current;
        if (first || !ex) return setBoard(b);
        ex.addFiles(Object.values((b.scene.files ?? {}) as BinaryFiles) as BinaryFileData[]);
        ex.updateScene({ elements: (b.scene.elements ?? []) as ExcalidrawElement[] });
        setBoard((prev) => (prev ? { ...prev, title: b.title, updatedAt: b.updatedAt } : b));
      } catch (e) {
        if (live && e instanceof ApiError && e.status === 404) setGone(true);
        // otherwise offline for now: the next round tries again
      }
    };
    void follow();
    const timer = setInterval(follow, every);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [from, every]);

  if (gone) return <div className="z center-msg"><p>{goneText}</p></div>;
  if (!board) return <div className="z center-msg">{t.loading}</div>;
  return <ReadOnlyBoard board={board} label={label} onApi={(a) => (excalidraw.current = a)} />;
}

/**
 * A board to look at, not change: a shared link's, or a student's board opened by a teacher (back: where the mark
 * leads, the teacher's page).
 */
export function ReadOnlyBoard({ board, back, onApi, label }: { board: SharedBoard; back?: string; onApi?: (api: ExcalidrawImperativeAPI) => void; label?: string }) {
  const { t, excalidrawLang } = useI18n();
  const scene = board.scene;
  const p = (scene.appState as { paper?: unknown } | undefined)?.paper;
  const paper = isPaper(p) ? p : "plain";
  useMemo(() => installPaper(paper), [paper]);
  useEffect(() => {
    installPaper(paper);
    return () => installPaper("plain");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="z board-page shared-board">
      <header className="board-bar">
        {back
          ? <a className="board-home" href={back} title={t.back} aria-label={t.back}><ZenoMark size={14} /></a>
          : <span className="board-home"><ZenoMark size={14} /></span>}
        <strong className="shared-title">{board.title}</strong>
        {label ? <span className="lesson-tag">{label}</span> : <span className="save-state saved">{t.readOnly}</span>}
        <div className="spacer" />
        <LangSelect />
      </header>
      <div className="canvas-wrap">
        <Excalidraw
          excalidrawAPI={onApi}
          langCode={excalidrawLang}
          viewModeEnabled
          initialData={{
            elements: (scene.elements ?? []) as ExcalidrawElement[],
            files: (scene.files ?? {}) as BinaryFiles,
            appState: { ...(scene.appState as Partial<AppState>), viewModeEnabled: true },
            scrollToContent: true,
          }}
          validateEmbeddable={(link) => (isLiveLink(link) ? true : undefined)}
          renderEmbeddable={(el) => (isLiveLink(el.link) ? liveDataOf(el) ? <LiveView element={el} host={READ_ONLY} /> : <div /> : null)}
          onLinkOpen={(el, e) => isLiveLink(el.link) && e.preventDefault()}
          UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, clearCanvas: false, export: false, changeViewBackgroundColor: false } }}
        />
      </div>
    </div>
  );
}
