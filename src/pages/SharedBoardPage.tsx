// A board seen through its read-only link (#/s/<token>): Excalidraw in view mode, with live pieces shown as they
// were left, following the board as its owner saves (it asks again every few seconds and redraws when it changed).
import { useEffect, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { AppState, BinaryFileData, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { api, ApiError, type SharedBoard } from "../api";
import { LangSelect, useI18n } from "../i18n";
import { isLiveLink, liveDataOf } from "../live/element";
import { LiveView, type LiveHost } from "../live/LiveView";

const FOLLOW_MS = 5000;
// Pieces can't be changed here: the host takes nothing back.
const READ_ONLY: LiveHost = { update: () => {}, snapshot: () => {}, freezeGraph: () => {} };

export function SharedBoardPage({ token }: { token: string }) {
  const { t, excalidrawLang } = useI18n();
  const [board, setBoard] = useState<SharedBoard | null>(null);
  const [gone, setGone] = useState(false);
  const excalidraw = useRef<ExcalidrawImperativeAPI | null>(null);
  const seen = useRef(-1);

  useEffect(() => {
    let live = true;
    const follow = async () => {
      try {
        const b = await api.shared(token);
        if (!live || b.updatedAt === seen.current) return;
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
    const timer = setInterval(follow, FOLLOW_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [token]);

  if (gone) return <div className="center-msg"><p>{t.sharedGone}</p></div>;
  if (!board) return <div className="center-msg">{t.loading}</div>;
  const scene = board.scene;
  return (
    <div className="board-page shared-board">
      <header className="board-bar">
        <strong className="shared-title">{board.title}</strong>
        <span className="save-state saved">👁 {t.readOnly}</span>
        <div className="spacer" />
        <LangSelect />
      </header>
      <div className="canvas-wrap">
        <Excalidraw
          excalidrawAPI={(a) => (excalidraw.current = a)}
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
