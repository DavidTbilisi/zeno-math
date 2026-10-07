// Draws a live piece inside its embeddable on the board: the piece at its design size, scaled to the element's size,
// with a button that copies what it shows as a picture. Changes go back to the board through the host, which writes
// them into the element (so they are saved and can be undone).
import { lazy, Suspense, useRef, type ComponentType } from "react";
import type { ExcalidrawEmbeddableElement, NonDeleted } from "@excalidraw/excalidraw/element/types";
import { useI18n } from "../i18n";
import { LIVE_SIZES, type LiveGraphState, type LiveKind } from "../math/live";
import { liveDataOf, type LiveData } from "./element";
import { Clock, Coin, Dice, Dots, Fractions, Hundred, Spinner, TenFrame } from "./pieces";
import { Chance } from "./Chance";
import type { PieceProps } from "./ui";

export type LiveHost = {
  update: (id: string, data: LiveData) => void;
  /** Puts a picture of the piece beside it. */
  snapshot: (id: string, svg: SVGSVGElement) => void;
  /** Puts an ordinary graph (the graph tool's, editable there) beside a live graph, with the sliders' values put in. */
  freezeGraph: (id: string, state: LiveGraphState) => void;
};

// The graph needs mathjs, so it loads the first time a board has one.
const LiveGraph = lazy(() => import("./LiveGraph").then((m) => ({ default: m.LiveGraph })));

const PIECES: { [K in LiveKind]: ComponentType<PieceProps<K>> } = {
  clock: Clock,
  dice: Dice,
  spinner: Spinner,
  coin: Coin,
  fractions: Fractions,
  tenFrame: TenFrame,
  hundred: Hundred,
  dots: Dots,
  graph: LiveGraph,
  chance: Chance,
};

export function LiveView({ element, host }: { element: NonDeleted<ExcalidrawEmbeddableElement>; host: LiveHost }) {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const data = liveDataOf(element);
  if (!data) return null;
  const kind = data.live;
  const [W, H] = LIVE_SIZES[kind];
  // The element's padding is its stroke width on each side.
  const [w, h] = [element.width - 2 * element.strokeWidth, element.height - 2 * element.strokeWidth];
  const s = Math.max(0.05, Math.min(w / W, h / H));
  const Piece = PIECES[kind] as ComponentType<PieceProps<typeof kind>>;
  return (
    <div className="live-host">
      <div
        className={`live live-${kind}`}
        style={{ width: W, height: H, transform: `translate(${(w - W * s) / 2}px, ${(h - H * s) / 2}px) scale(${s})` }}
      >
        <Suspense fallback={null}>
          <Piece state={data.state} set={(state) => host.update(element.id, { live: kind, state })} w={t.live} svgRef={svgRef} />
        </Suspense>
        <button
          className="live-snap"
          title={kind === "graph" ? t.live.freeze : t.live.snapshot}
          aria-label={kind === "graph" ? t.live.freeze : t.live.snapshot}
          onClick={() => {
            if (kind === "graph") host.freezeGraph(element.id, data.state as LiveGraphState);
            else if (svgRef.current) host.snapshot(element.id, svgRef.current);
          }}
        >
          📷
        </button>
      </div>
    </div>
  );
}
