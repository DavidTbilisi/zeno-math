// Dark-board pictures: the dark version wraps the picture in a filter and comes back unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ALGEBRA_PRESETS, renderAlgebra } from "../src/math/algebra.ts";
import { darkSvg, dataUrlToSvg, isDarkSvg, lightSvg, svgToDataUrl, themedSvg } from "../src/math/svg.ts";

test("dark and back is the same picture, and twice dark is once dark", () => {
  const svg = renderAlgebra(ALGEBRA_PRESETS.quadratic[2].spec, ka.algebraWords).svg;
  const dark = darkSvg(svg);
  assert.ok(isDarkSvg(dark) && !isDarkSvg(svg));
  assert.match(dark, /^<svg[^>]*><defs data-zeno-dark=""><filter id="zeno-dark"/);
  assert.ok(dark.endsWith("</g></svg>"));
  assert.equal(darkSvg(dark), dark);
  assert.equal(lightSvg(dark), svg);
  assert.equal(lightSvg(svg), svg);
  assert.equal(themedSvg(themedSvg(svg, "dark"), "light"), svg);
});

test("data URLs round-trip, Georgian text included", () => {
  const svg = renderAlgebra(ALGEBRA_PRESETS.linear[0].spec, ka.algebraWords).svg;
  assert.equal(dataUrlToSvg(svgToDataUrl(svg)), svg);
  assert.equal(dataUrlToSvg("data:image/png;base64,AAAA"), null);
  assert.ok(renderAlgebra(ALGEBRA_PRESETS.linear[0].spec, en.algebraWords).svg.includes("Noto Sans Georgian"));
});
