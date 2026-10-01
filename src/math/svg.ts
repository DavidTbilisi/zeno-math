export function svgToDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}

export function dataUrlToSvg(url: string): string | null {
  const m = /^data:image\/svg\+xml;base64,(.*)$/.exec(url);
  if (!m) return null;
  const bin = atob(m[1]);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// Dark boards: the picture is inverted and its hues turned back (Excalidraw darkens its own canvas the same way),
// so white becomes the board's dark grey, ink becomes light, and blue stays blue. Undone exactly by `lightSvg`.
const DARK_OPEN =
  `<defs data-zeno-dark=""><filter id="zeno-dark" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">` +
  `<feColorMatrix type="matrix" values="-0.86 0 0 0 0.93 0 -0.86 0 0 0.93 0 0 -0.86 0 0.93 0 0 0 1 0"/>` +
  `<feColorMatrix type="hueRotate" values="180"/></filter></defs><g filter="url(#zeno-dark)">`;
const DARK_CLOSE = `</g>`;

export const isDarkSvg = (svg: string) => svg.includes("data-zeno-dark");

/** The same picture for a dark board. */
export function darkSvg(svg: string): string {
  if (isDarkSvg(svg)) return svg;
  const open = svg.indexOf(">") + 1;
  const close = svg.lastIndexOf("</svg>");
  return svg.slice(0, open) + DARK_OPEN + svg.slice(open, close) + DARK_CLOSE + svg.slice(close);
}

/** Back to the original picture. */
export function lightSvg(svg: string): string {
  if (!isDarkSvg(svg)) return svg;
  const at = svg.indexOf(DARK_OPEN);
  const close = svg.lastIndexOf(DARK_CLOSE + "</svg>");
  return svg.slice(0, at) + svg.slice(at + DARK_OPEN.length, close) + svg.slice(close + DARK_CLOSE.length);
}

export const themedSvg = (svg: string, theme: string) => (theme === "dark" ? darkSvg(svg) : lightSvg(svg));
