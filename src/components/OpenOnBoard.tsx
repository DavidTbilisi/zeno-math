// "Open on a board" on a page of the site: puts a tool, piece or game on a board kept for this browser under `slot`
// (one per topic, made the first time), where it can be drawn on and kept. A student without a class has no boards.
import { useState } from "react";
import { ApiError } from "../api";
import { useI18n } from "../i18n";
import { openOnStageBoard } from "../stageBoards";

export function OpenOnBoard({ slot, name, path, className = "z-btn z-btn-line" }: { slot: string; name: string; path: string; className?: string }) {
  const { t } = useI18n();
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState<false | true | "refused">(false);
  const open = async () => {
    setOpening(true);
    setFailed(false);
    try {
      await openOnStageBoard("zeno.site.boards", slot, name, path);
    } catch (e) {
      setFailed(e instanceof ApiError && e.status === 403 ? "refused" : true);
      setOpening(false);
    }
  };
  return (
    <>
      <button className={className} disabled={opening} onClick={() => void open()}>{t.site.openBoard}</button>
      {failed && <p className="error small" role="alert">{failed === "refused" ? t.boardsNeedOwner : t.roadmap.failed}</p>}
    </>
  );
}
