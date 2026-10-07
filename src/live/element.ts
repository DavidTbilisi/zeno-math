// Live pieces are Excalidraw "embeddables" (the element Excalidraw uses for videos and web pages) pointing at an
// address of our own that never loads anything: the board draws them itself, in React, and keeps their state in
// the element's customData, so they are saved, copied, undone and deleted like any other element.
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { initialLive, isLiveKind, LIVE_SIZES, type LiveKind, type LiveStates } from "../math/live";

// .invalid is reserved and never resolves, so the address can't lead anywhere if a board is opened elsewhere.
export const LIVE_LINK = "https://live.zeno.invalid/";

export type LiveData<K extends LiveKind = LiveKind> = { live: K; state: LiveStates[K] };

export const isLiveLink = (link: string | null | undefined) => !!link && link.startsWith(LIVE_LINK);

export function liveDataOf(el: { link?: string | null; customData?: Record<string, unknown> }): LiveData | undefined {
  const d = el.customData;
  return isLiveLink(el.link) && d && isLiveKind(d.live) && d.state && typeof d.state === "object" ? (d as LiveData) : undefined;
}

/** A new live piece at (x, y), at its design size, in its starting state. */
export function liveElement(kind: LiveKind, x = 0, y = 0): ExcalidrawElement {
  const [width, height] = LIVE_SIZES[kind];
  const [box] = convertToExcalidrawElements([
    { type: "rectangle", x, y, width, height, strokeColor: "#ced4da", backgroundColor: "transparent", strokeWidth: 1, roughness: 0, roundness: { type: 3 } },
  ]);
  const customData: LiveData = { live: kind, state: initialLive(kind) };
  return { ...box, type: "embeddable", link: LIVE_LINK + kind, customData } as unknown as ExcalidrawElement;
}
