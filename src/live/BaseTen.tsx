// Base-ten blocks on the board: the place-value mat from Models → Place value (src/components/PlaceValueMat.tsx),
// here as a live piece, so blocks are dragged, traded and counted right on the board. "Copy as a picture" places the
// mat as the same picture the Models tool makes.
import { useLayoutEffect, useRef } from "react";
import { PlaceValueMat } from "../components/PlaceValueMat";
import { renderPlaceValue } from "../math/placeValue";
import type { PieceProps } from "./ui";

export function BaseTen({ state, set, svgRef }: PieceProps<"baseTen">) {
  const picture = useRef<HTMLDivElement>(null);
  const svg = renderPlaceValue(state).svg;
  // The copy is drawn hidden; the piece's svgRef points at it.
  useLayoutEffect(() => {
    svgRef.current = picture.current?.querySelector("svg") ?? null;
  }, [svg, svgRef]);
  return (
    <>
      <PlaceValueMat spec={state} onChange={set} />
      <div ref={picture} hidden dangerouslySetInnerHTML={{ __html: svg }} />
    </>
  );
}
