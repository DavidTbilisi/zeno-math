// One picture per topic for its intro (#450): our own drawings, with no words in them so they serve every language, in
// the site's ink, marker and grid colours (so they follow the dark theme). 240 × 160 each.
import type { ReactNode } from "react";
import type { TopicId } from "../model/topics";

const T = ({ x, y, children, size = 14 }: { x: number; y: number; children: ReactNode; size?: number }) => (
  <text x={x} y={y} className="tp-text" fontSize={size} textAnchor="middle">{children}</text>
);
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
/** The slice of a circle from angle a to b (degrees, clockwise from the top). */
function slice(cx: number, cy: number, r: number, a: number, b: number) {
  const p = (d: number) => [cx + r * Math.sin((d * Math.PI) / 180), cy - r * Math.cos((d * Math.PI) / 180)].map((v) => v.toFixed(1)).join(" ");
  return `M${cx} ${cy} L${p(a)} A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${p(b)} Z`;
}
const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);

const PICTURES: Record<TopicId, ReactNode> = {
  numbers: (
    <>
      <path d="M15 118 H225" />
      {range(11).map((i) => <path key={i} d={`M${20 + i * 20} 111 V125`} />)}
      {[0, 1, 2].map((j) => <path key={j} className="tp-mark-line" d={`M${20 + j * 60} 108 Q${50 + j * 60} 52 ${80 + j * 60} 108`} />)}
      {[0, 3, 6, 9].map((n) => <T key={n} x={20 + n * 20} y={146}>{n}</T>)}
      <T x={50} y={60} size={16}>+3</T><T x={110} y={60} size={16}>+3</T><T x={170} y={60} size={16}>+3</T>
    </>
  ),
  fractions: (
    <>
      {range(8).map((i) => <path key={i} className={i < 3 ? "tp-mark" : "tp-soft"} d={slice(72, 80, 56, i * 45, i * 45 + 45)} />)}
      <T x={72} y={154}>3/8</T>
      <rect className="tp-mark" x={150} y={34} width={36} height={92} />
      <rect className="tp-soft" x={186} y={34} width={36} height={92} />
      <T x={186} y={154}>1/2</T>
    </>
  ),
  geometry: (
    <>
      <path className="tp-soft" d="M20 136 L124 136 L52 40 Z" />
      <path className="tp-mark-line" d="M40 136 A20 20 0 0 0 32 120" />
      <path className="tp-mark-line" d="M108 136 A16 16 0 0 1 114 123" />
      <circle cx={178} cy={52} r={32} />
      <path d="M178 52 L210 52" /><circle className="tp-dot" cx={178} cy={52} r={3.5} />
      <path d="M150 104 h44 v44 h-44 Z M150 104 l16 -14 h44 l-16 14 M194 148 l16 -14 v-44" />
    </>
  ),
  algebra: (
    <>
      <path d="M120 54 V140 M92 140 H148" />
      <path d="M30 54 H210" />
      <circle className="tp-dot" cx={120} cy={54} r={5} />
      <path d="M30 54 L16 104 M30 54 L64 104 M210 54 L176 104 M210 54 L224 104" />
      <path className="tp-soft" d="M12 104 H68 Q40 124 12 104 Z M172 104 H228 Q200 124 172 104 Z" />
      <rect className="tp-mark" x={20} y={74} width={26} height={30} rx={3} />
      <T x={33} y={95} size={16}>x</T>
      <circle cx={56} cy={96} r={7} />
      {[180, 196, 212].map((x) => <circle key={x} cx={x} cy={96} r={7} />)}
      {[188, 204].map((x) => <circle key={x} cx={x} cy={82} r={7} />)}
    </>
  ),
  functions: (
    <>
      <path d="M30 14 V140 H226" />
      <path className="tp-mark-line" d="M30 132 C 80 132, 100 24, 150 30 S 210 100, 222 118" />
      {[[79.4, 94.4], [150, 30], [203.2, 75.2]].map(([x, y]) => <circle key={x} className="tp-dot" cx={x} cy={y} r={4.5} />)}
    </>
  ),
  trigonometry: (
    <>
      <path className="tp-soft" d="M16 132 L128 132 L128 44 Z" />
      <path d="M116 132 V120 H128" />
      <path className="tp-mark-line" d="M48 132 A32 32 0 0 0 41 112" />
      <T x={60} y={124} size={15}>θ</T>
      <path d="M146 92 H234" strokeDasharray="3 5" />
      <path className="tp-mark-line" d="M146 92 C 158 50, 168 50, 179 92 S 200 134, 212 92 S 226 56, 234 70" />
    </>
  ),
  probability: (
    <>
      <rect x={20} y={14} width={60} height={60} rx={10} />
      {[[36, 30], [64, 30], [50, 44], [36, 58], [64, 58]].map(([x, y]) => <circle key={`${x}${y}`} className="tp-dot" cx={x} cy={y} r={4.5} />)}
      <path className="tp-mark" d={slice(170, 50, 38, 0, 180)} />
      <path className="tp-soft" d={slice(170, 50, 38, 180, 360)} />
      <path d="M170 50 L194 26" /><circle className="tp-dot" cx={170} cy={50} r={4} />
      <path d="M20 128 H220" />
      {[20, 120, 220].map((x) => <path key={x} d={`M${x} 121 V135`} />)}
      <T x={20} y={154}>0</T><T x={120} y={154}>1/2</T><T x={220} y={154}>1</T>
      <circle className="tp-mark" cx={53} cy={128} r={6} />
      <circle className="tp-mark" cx={120} cy={128} r={6} />
    </>
  ),
  statistics: (
    <>
      <path d="M20 140 H224" />
      {[44, 76, 112, 62, 30].map((h, i) => <rect key={i} className={i === 2 ? "tp-mark" : "tp-soft"} x={30 + i * 40} y={140 - h} width={28} height={h} />)}
      <path d="M22 75 H222" strokeDasharray="6 5" />
      <path className="tp-mark-line" d="M24 134 C 70 134, 90 22, 124 22 S 178 134, 222 134" />
    </>
  ),
  numberTheory: (
    <>
      {range(24).map((i) => {
        const n = i + 1, x = 30 + (i % 6) * 36, y = 24 + Math.floor(i / 6) * 36;
        return (
          <g key={n}>
            <circle className={PRIMES.has(n) ? "tp-mark" : "tp-soft"} cx={x} cy={y} r={15} />
            <T x={x} y={y + 5}>{n}</T>
          </g>
        );
      })}
    </>
  ),
  finance: (
    <>
      <path d="M20 142 H224" />
      {[22, 28, 36, 47, 61, 79, 103].map((h, i) => <rect key={i} className="tp-soft" x={28 + i * 28} y={142 - h} width={20} height={h} />)}
      <path className="tp-mark-line" d="M38 118 C 100 112, 160 90, 210 36" />
      <circle className="tp-mark" cx={210} cy={28} r={13} /><T x={210} y={33}>%</T>
    </>
  ),
  logic: (
    <>
      <ellipse className="tp-soft" cx={86} cy={80} rx={70} ry={58} />
      <ellipse className="tp-mark" cx={70} cy={88} rx={34} ry={28} />
      <circle className="tp-dot" cx={66} cy={90} r={5} />
      <path d="M164 80 H222 M208 68 L222 80 L208 92" />
      <path d="M164 74 H218" />
    </>
  ),
  discrete: (
    <>
      {[[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5], [1, 2]].map(([a, b]) => {
        const P = [[28, 80], [84, 28], [92, 120], [150, 64], [160, 140], [214, 92]];
        const hot = [[0, 2], [2, 3], [3, 5]].some(([x, y]) => x === a && y === b);
        return <path key={`${a}${b}`} className={hot ? "tp-mark-line" : undefined} d={`M${P[a][0]} ${P[a][1]} L${P[b][0]} ${P[b][1]}`} />;
      })}
      {[[28, 80], [84, 28], [92, 120], [150, 64], [160, 140], [214, 92]].map(([x, y], i) => <circle key={i} className={i === 0 || i === 5 ? "tp-mark" : "tp-paper"} cx={x} cy={y} r={11} />)}
    </>
  ),
  algorithms: (
    <>
      <path d="M16 142 H226" />
      {[30, 50, 70, 90, 106, 80].map((h, i) => <rect key={i} className={i === 4 || i === 5 ? "tp-mark" : "tp-soft"} x={22 + i * 34} y={142 - h} width={26} height={h} />)}
      <path d="M171 28 Q188 8 205 52 M199 47 L205 52 L207 44" />
    </>
  ),
  vectors: (
    <>
      <g className="tp-grid">{range(12).map((i) => <path key={`v${i}`} d={`M${10 + i * 20} 8 V152`} />)}{range(8).map((i) => <path key={`h${i}`} d={`M10 ${12 + i * 20} H230`} />)}</g>
      <path d="M30 132 L110 112 M100 106 L110 112 L102 120" />
      <path d="M110 112 L170 32 M158 36 L170 32 L170 44" />
      <path className="tp-mark-line" d="M30 132 L170 32 M156 34 L170 32 L164 46" />
    </>
  ),
  calculus: (
    <>
      <path d="M20 14 V142 H226" />
      <path className="tp-soft" d="M44 142 V122 C 70 112, 96 96, 120 74 V142 Z" />
      <path d="M24 130 C 70 116, 120 80, 150 50 S 200 18, 224 16" />
      <path className="tp-mark-line" d="M92 120 L208 18" />
      <circle className="tp-dot" cx={150} cy={50} r={5} />
    </>
  ),
  analysis: (
    <>
      {[[20, 100], [120, 50], [170, 25], [195, 12.5], [207.5, 6.25], [213.75, 3.125], [216.875, 1.5625]].map(([x, w], i) => (
        <rect key={i} className={i % 2 ? "tp-soft" : "tp-mark"} x={x} y={62} width={w} height={40} />
      ))}
      <path d="M220 52 V112" />
      <T x={70} y={50}>1/2</T><T x={145} y={50}>1/4</T><T x={182} y={50}>1/8</T>
      <T x={220} y={134} size={16}>1</T>
    </>
  ),
  abstract: (
    <>
      <path className="tp-soft" d="M72 30 L132 30 L132 90 L72 90 Z" transform="rotate(0)" />
      <path d="M102 16 V104 M58 60 H146 M60 18 L144 102 M144 18 L60 102" strokeDasharray="4 5" />
      <circle className="tp-mark" cx={72} cy={30} r={7} />
      <path className="tp-mark-line" d="M170 60 A36 36 0 1 1 200 96" />
      <path d="M196 86 L200 96 L190 100" />
      <T x={196} y={66} size={16}>90°</T>
      <path d="M72 120 h20 v20 h-20 Z M100 120 h20 v20 h-20 Z" />
    </>
  ),
  optimisation: (
    <>
      <path d="M14 26 C 60 30, 80 136, 130 136 S 200 60, 228 30" />
      {[[42, 36], [70, 82], [96, 120], [118, 134]].map(([x, y], i, a) => (
        <g key={i}>
          <circle className="tp-dot" cx={x} cy={y - 10} r={4} />
          {i < a.length - 1 && <path className="tp-mark-line" d={`M${x + 4} ${y - 8} L${a[i + 1][0] - 4} ${a[i + 1][1] - 14}`} />}
        </g>
      ))}
      <circle className="tp-mark" cx={130} cy={124} r={10} />
    </>
  ),
  topology: (
    <>
      <ellipse className="tp-mark" cx={62} cy={84} rx={50} ry={34} />
      <ellipse className="tp-paper" cx={62} cy={80} rx={18} ry={9} />
      <path d="M100 76 H140 M130 68 L140 76 L130 84 M140 92 H100 M110 84 L100 92 L110 100" />
      <path className="tp-mark" d="M156 46 H210 V112 Q210 124 198 124 H168 Q156 124 156 112 Z" />
      <path d="M210 62 Q236 62 236 82 Q236 102 210 102" />
    </>
  ),
  ai: (
    <>
      {(() => {
        const L = [[30, [34, 80, 126]], [100, [22, 62, 102, 142]], [170, [34, 80, 126]], [220, [56, 104]]] as const;
        const out: ReactNode[] = [];
        L.slice(0, -1).forEach(([x, ys], l) => ys.forEach((y) => L[l + 1][1].forEach((y2) => out.push(<path key={`${x}-${y}-${y2}`} className="tp-thin" d={`M${x} ${y} L${L[l + 1][0]} ${y2}`} />))));
        L.forEach(([x, ys], l) => ys.forEach((y) => out.push(<circle key={`n${x}-${y}`} className={l === 0 ? "tp-soft" : l === L.length - 1 ? "tp-mark" : "tp-paper"} cx={x} cy={y} r={10} />)));
        return out;
      })()}
    </>
  ),
};

export function TopicPicture({ topic, label }: { topic: TopicId; label?: string }) {
  return (
    <svg className="topic-pic" viewBox="0 0 240 160" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <g fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">{PICTURES[topic]}</g>
    </svg>
  );
}
