// Practice: Practical trigonometry.
import { old as righttri } from "./righttri";
import { C, fill, r2 } from "../chart";
import type { Answer, Gen } from "../practiceTypes";

/** The signs for metres an answer may end in: English, Russian, Georgian. */
const METRES = ["m", "м", "მ"] as const;

const gen: Gen = (r, L, w) => {
  const ex = righttri(r, L, w);
  const s = ex.solution!.spec as { given: string; ask: "opp" | "adj" | "hyp" | "ang"; opp: string; adj: string; hyp: string; ang: string };
  const p = w.practicalTrig;
  const scenario = r.pick(["ladder", "ramp", "cable"] as const);
  const keys = { angHyp: ["ang", "hyp"], angAdj: ["ang", "adj"], angOpp: ["ang", "opp"], oppAdj: ["opp", "adj"], oppHyp: ["opp", "hyp"], adjHyp: ["adj", "hyp"] } as const;
  const given = keys[s.given as keyof typeof keys].map((k) => fill(p.given, { name: p[k], value: s[k], unit: k === "ang" ? "°" : "m" })).join("; ");
  const original = ex.pic!;
  return {
    ...ex,
    prompt: `${p[scenario]} ${given}. ${fill(p.find, { name: p[s.ask] })} ${s.ask === "ang" ? p.angle : p.length} ${p.diagram}`,
    pic: {
      ...original,
      svg: (x: number, y: number) => {
        const svg = original.svg(x, y);
        // Keep the same mathematical geometry as the checked question, adding the physical setting.
        const points = /points="([^"]+)"/.exec(svg)![1].split(/[ ,]/).map(Number);
        const [bx, by, cx, , , ay] = points;
        const setting = `<path d="M${bx - 8},${by + 3} H${cx + 5} V${ay - 8}" fill="none" stroke="${C.ink}" stroke-width="3"/>`;
        const rungs = scenario === "ladder" ? Array.from({ length: 7 }, (_, i) => {
          const t = (i + 1) / 8;
          const px = bx + (cx - bx) * t;
          const py = by + (ay - by) * t;
          return `<path d="M${r2(px - 3)},${r2(py - 4)} l6,8" stroke="${C.orange}" stroke-width="2"/>`;
        }).join("") : "";
        return setting + svg + rungs;
      },
    },
    show: `${ex.show}${s.ask === "ang" ? "" : "\\,\\mathrm{m}"}`,
    // A length may be typed with its unit, in any of the three languages: "5.64 m", "5.64м", "5.64 მ".
    ...(s.ask === "ang" ? {} : { answer: { ...ex.answer, units: METRES } as Answer }),
  };
};

export default gen;
