// Draws a live piece inside its embeddable on the board: the piece at its design size, scaled to the element's size,
// with a button that copies what it shows as a picture. Changes go back to the board through the host, which writes
// them into the element (so they are saved and can be undone).
import { Suspense, useContext, useLayoutEffect, useRef, useState, type ComponentType, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import type { ExcalidrawEmbeddableElement, NonDeleted } from "@excalidraw/excalidraw/element/types";
import { useI18n } from "../i18n";
import { initialLive, LIVE_SIZES, type LiveGraphState, type LiveKind } from "../math/live";
import { PanelSlot } from "../components/ItemPanel";
import { liveDataOf, type LiveData } from "./element";
import { PIECES } from "./registry";
import type { PieceProps } from "./ui";

export type LiveHost = {
  update: (id: string, data: LiveData) => void;
  /** Puts a picture of the piece beside it. */
  snapshot: (id: string, svg: SVGSVGElement) => void;
  /** Puts an ordinary graph (the graph tool's, editable there) beside a live graph, with the sliders' values put in. */
  freezeGraph: (id: string, state: LiveGraphState) => void;
  /** Puts a new piece of the kind beside the piece, its starting state changed by the patch (not where the board is only read). */
  open?: (id: string, kind: LiveKind, patch?: object) => void;
};

const stop = (e: SyntheticEvent) => e.stopPropagation();

export function LiveView({ element, host }: { element: NonDeleted<ExcalidrawEmbeddableElement>; host: LiveHost }) {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const data = liveDataOf(element);
  // The right-click panel, when it is open on this piece: its reset and copy buttons go there.
  const slot = useContext(PanelSlot);
  const panelNode = slot?.id === element.id ? slot.node : null;
  const H0 = data ? LIVE_SIZES[data.live][1] : 0;
  // The piece keeps its design height (some fill it, like the problem stage); when what it shows runs taller (the code
  // view, a long line in Georgian), the overflow is measured and the whole of it scaled into the element, instead of the
  // bottom being cut off. The box itself never changes size, so its children are watched, and new ones as they come.
  const [tall, setTall] = useState(H0);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setTall(el.scrollHeight);
    const ro = new ResizeObserver(measure);
    const watch = () => {
      ro.disconnect();
      for (const c of Array.from(el.children)) ro.observe(c);
      measure();
    };
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(el, { childList: true });
    return () => (ro.disconnect(), mo.disconnect());
  }, [H0]);
  if (!data) return null;
  const kind = data.live;
  const W = LIVE_SIZES[kind][0];
  const H = Math.max(H0, tall);
  // The element's padding is its stroke width on each side.
  const [w, h] = [element.width - 2 * element.strokeWidth, element.height - 2 * element.strokeWidth];
  const s = Math.max(0.05, Math.min(w / W, h / H));
  const Piece = PIECES[kind] as ComponentType<PieceProps<typeof kind>>;
  const snapshot = () => {
    if (kind === "graph") host.freezeGraph(element.id, data.state as LiveGraphState);
    else if (svgRef.current) host.snapshot(element.id, svgRef.current);
  };
  return (
    <div className="live-host">
      <div
        ref={boxRef}
        className={`live live-${kind}`}
        style={{ width: W, height: H0, transform: `translate(${(w - W * s) / 2}px, ${(h - H * s) / 2}px) scale(${s})` }}
      >
        <Suspense fallback={null}>
          <Piece state={data.state} set={(state) => host.update(element.id, { live: kind, state })} w={t.live} svgRef={svgRef} open={host.open && ((k, patch) => host.open?.(element.id, k, patch))} />
        </Suspense>
        {panelNode &&
          createPortal(
            // Events stop here: in React they would bubble on through the piece to the board's embeddable.
            <span className="piece-panel-part" onPointerDown={stop} onMouseDown={stop} onClick={stop} onKeyDown={stop} onContextMenu={stop}>
              <button className="btn" onClick={() => host.update(element.id, { live: kind, state: initialLive(kind) })}>↺ {t.live.reset}</button>
              <button className="btn" onClick={snapshot}>📷 {kind === "graph" ? t.live.freeze : t.live.snapshot}</button>
            </span>,
            panelNode,
          )}
        <button
          className="live-snap"
          title={kind === "graph" ? t.live.freeze : t.live.snapshot}
          aria-label={kind === "graph" ? t.live.freeze : t.live.snapshot}
          onClick={snapshot}
        >
          📷
        </button>
      </div>
    </div>
  );
}
