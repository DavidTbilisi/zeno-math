// Build a solid from its three views, by hand: drag the floor to look round it, tap a cube (or a floor square) to stack
// one more there, drag a cube onto another stack to move it or into the bin to take it away, and drag a new cube in
// from the tray. The puzzle's pills (undo, show the solution, check, the next one) and the difficulty sit in the picture.
import { useState, type PointerEvent } from 'react';
import { project, cameraPoint, solidMatches, viewsPuzzle, viewEdges, viewMatches, type View } from '../math/views3d';
import { BLUE, Bin, inBox, MUTED, Pill, Tabs, useDrag } from './hand';
import { FONT, type PieceProps } from './ui';

const [W, H] = [760, 700];
const TRAY = { x: 22, y: 232, w: 104, h: 104 };
const BIN = { x: 24, y: 470, w: 100, h: 66 };
const [ROW1, ROW2] = [608, 654];
const LEVELS = ['easy', 'medium', 'hard'] as const;
const pillW = (s: string) => 30 + 8.2 * [...s].length;
/** Where each pill of a row starts so the row is centred on the picture. */
const centred = (ws: number[], gap = 10) => {
  let at = (W - ws.reduce((a, b) => a + b, 0) - gap * (ws.length - 1)) / 2;
  return ws.map(w => { const x = at; at += w + gap; return x; });
};

type Grab = { kind: 'look'; rotation: number; tilt: number; roll: number; rolling: boolean } | { kind: 'cube'; i: number } | { kind: 'new' };

/** A small cube drawn at (x, y): the tray's cube and the one following a drag. */
function CubeIcon({ x, y, s = 22, ghost }: { x: number; y: number; s?: number; ghost?: boolean }) {
  const [a, b] = [s * 0.87, s * 0.5];
  return <g opacity={ghost ? 0.85 : 1} pointerEvents="none" stroke={ghost ? BLUE : '#6c8976'} strokeWidth={ghost ? 2 : 1.2} strokeLinejoin="round">
    <polygon points={`${x},${y - s} ${x + a},${y - b} ${x},${y} ${x - a},${y - b}`} fill="#e0edda" />
    <polygon points={`${x - a},${y - b} ${x},${y} ${x},${y + s} ${x - a},${y + b}`} fill="#c0d8c2" />
    <polygon points={`${x + a},${y - b} ${x},${y} ${x},${y + s} ${x + a},${y + b}`} fill="#a6c6ae" />
  </g>;
}

export function Views3d({ state: d, set, w: words, svgRef }: PieceProps<'views3d'>) {
  const w = words.views3d;
  const [rotation, setRotation] = useState(0);
  const [tilt, setTilt] = useState(35.264);
  const [roll, setRoll] = useState(0);
  const target = viewsPuzzle(d.stage, d.seed, d.difficulty);
  const difficulty = d.difficulty ?? (Math.max(...target) <= 1 ? 'easy' : Math.max(...target) <= 2 ? 'medium' : 'hard');
  const heights = d.revealed ? target : d.heights;
  const won = d.checked && solidMatches(d.heights, target);
  const put = (next: number[]) => {
    if (d.revealed || next.every((h, k) => h === d.heights[k])) return;
    set({ ...d, heights: next, history: [...d.history.slice(-49), d.heights], checked: false });
  };
  const bump = (hs: number[], i: number, delta: number) => hs.map((v, k) => k === i ? Math.max(0, Math.min(3, v + delta)) : v);
  const reset = (stage = d.stage) => set({ stage, difficulty: d.difficulty, seed: d.seed, heights: Array(9).fill(0), history: [], checked: false, revealed: false });
  const pickLevel = (mode: typeof LEVELS[number]) => {
    if (mode === difficulty) return;
    set({ stage: 0, seed: d.seed, difficulty: mode, heights: Array(9).fill(0), history: [], checked: false, revealed: false });
    setRotation(0); setTilt(35.264); setRoll(0);
  };
  /** The stack whose cube or floor square is drawn under a point of the picture. */
  const stackUnder = (x: number, y: number): number | undefined => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return undefined;
    const p = new DOMPoint(x, y).matrixTransform(ctm);
    const id = document.elementFromPoint(p.x, p.y)?.closest('[data-col]')?.getAttribute('data-col');
    return id == null ? undefined : Number(id);
  };
  const { drag, begin, svgProps } = useDrag<Grab>(g => {
    if (g.kind === 'look') return;
    const to = g.moved ? stackUnder(g.x, g.y) : undefined;
    if (g.kind === 'new') {
      if (to !== undefined) put(bump(d.heights, to, 1));
    } else if (!g.moved) put(bump(d.heights, g.i, 1));
    else if (inBox(BIN, g.x, g.y)) put(bump(d.heights, g.i, -1));
    else if (to !== undefined && to !== g.i && d.heights[to] < 3) put(bump(bump(d.heights, g.i, -1), to, 1));
  }, g => {
    if (g.kind !== 'look' || !g.moved) return;
    const [dx, dy] = [g.x - g.x0, g.y - g.y0];
    if (g.rolling) setRoll(g.roll + dx * .6);
    else { setRotation(g.rotation - dx / 140); setTilt(g.tilt + dy * .6); }
  });
  const look = (e: PointerEvent) => begin(e, { kind: 'look', rotation, tilt, roll, rolling: e.shiftKey });
  const carrying = drag?.moved && drag.kind !== 'look';
  const overBin = !!(drag?.moved && drag.kind === 'cube' && inBox(BIN, drag.x, drag.y));

  const camera = (x: number, y: number, z: number) => cameraPoint(x,y,z,rotation,tilt,roll);
  const iso = (x: number, y: number, z: number) => {
    const [px,py] = camera(x,y,z);
    return [380+px*68,400+py*68];
  };
  const points = (vs: number[][]) => vs.map(v => iso(v[0],v[1],v[2]).join(',')).join(' ');
  const direction = (x: number, y: number) => iso(x,y,0);
  const faces: { i: number; vertices: number[][]; depth: number; color: string }[] = [];
  const occupied = (x:number,y:number,z:number) => x>=0 && x<3 && y>=0 && y<3 && z>=0 && z<heights[y*3+x];
  heights.forEach((h,i)=>{
    const x=i%3,y=Math.floor(i/3);
    if (!h) {
      const vertices=[[x,y,0],[x+1,y,0],[x+1,y+1,0],[x,y+1,0]];
      faces.push({i,vertices,depth:camera(x+.5,y+.5,0)[2],color:'#f2f5ef'});
    }
    for(let z=0;z<h;z++) {
      const sides = [
        {n:[1,0,0],v:[[x+1,y,z],[x+1,y+1,z],[x+1,y+1,z+1],[x+1,y,z+1]],color:'#c0d8c2'},
        {n:[-1,0,0],v:[[x,y,z],[x,y+1,z],[x,y+1,z+1],[x,y,z+1]],color:'#c0d8c2'},
        {n:[0,1,0],v:[[x,y+1,z],[x+1,y+1,z],[x+1,y+1,z+1],[x,y+1,z+1]],color:'#a6c6ae'},
        {n:[0,-1,0],v:[[x,y,z],[x+1,y,z],[x+1,y,z+1],[x,y,z+1]],color:'#a6c6ae'},
        {n:[0,0,1],v:[[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]],color:'#e0edda'},
        {n:[0,0,-1],v:[[x,y,z],[x+1,y,z],[x+1,y+1,z],[x,y+1,z]],color:'#c4d7c3'},
      ];
      for(const {n,v,color} of sides) {
        if(occupied(x+n[0],y+n[1],z+n[2])) continue;
        if(camera(x+n[0],y+n[1],z+n[2])[2]-camera(x,y,z)[2]<=1e-8) continue;
        const centre=v[0].map((_,k)=>v.reduce((sum,p)=>sum+p[k],0)/4);
        faces.push({i,vertices:v,depth:camera(centre[0],centre[1],centre[2])[2],color});
      }
    }
  });
  faces.sort((a,b)=>a.depth-b.depth);

  // The pills along the bottom: take a turn back, show (or hide) the solution, and check, or the next puzzle once it's right.
  const [revealText, checkText] = [d.revealed ? `⟲ ${w.retry}` : `👁 ${w.reveal}`, won ? `${w.next} →` : `✓ ${w.check}`];
  const row1 = centred([44, pillW(revealText), pillW(checkText) + 16]);
  const levelW = LEVELS.map(k => Math.max(60, w[k].length * 14 * 0.6 + 24));
  const levelX = (W - levelW.reduce((a, b) => a + b, 0) - 6 * (LEVELS.length - 1)) / 2;
  const puzzleText = `${w.puzzle} ${d.stage + 1}`;

  return <>
    <div className="views-heading"><b>{w.title}</b></div>
    <p className="views-intro">{w.prompt}</p>
    <svg ref={svgRef} className="hand-pic" width="720" height={Math.round(H * 720 / W)} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} aria-label={w.title}
      style={{ touchAction: 'none' }} {...svgProps}>
      <rect width={W} height={H} rx="12" fill="#fafbf7" style={{ cursor: 'grab' }} onPointerDown={look}/>
      {(['top','front','side'] as View[]).map((view,k) => {
        const clue = project(target,view), actual = project(d.heights,view);
        const edges = viewEdges(clue), currentEdges = new Set(viewEdges(actual));
        const ok = viewMatches(d.heights,target,view);
        return <g key={view} transform={`translate(${62+k*240},35)`}>
          <rect x="-18" y="-30" width="168" height="180" rx="16" fill="#fff"/>
          <text x="66" y="-8" textAnchor="middle" fontSize="15" fontWeight="600" fill="#426151">{w[view]} {d.checked ? ok ? '✓' : '○' : ''}</text>
          {clue.map((v,i) => <rect key={i} x={i%3*44} y={Math.floor(i/3)*44} width="44" height="44" fill={v>=0 ? '#d8e7d1' : '#fff'}/>)}
          <rect width="132" height="132" fill="none" stroke="#95a58d" strokeWidth="1.4"/>
          {[1,2].map(n=><g key={n} stroke="#95a58d" strokeWidth="1.4" strokeDasharray="4 3">
            <line x1={n*44} y1="0" x2={n*44} y2="132"/>
            <line x1="0" y1={n*44} x2="132" y2={n*44}/>
          </g>)}
          {edges.map(edge => { const [x,y,u,v] = edge.split(',').map(Number); return <line key={edge} x1={x*44} y1={y*44} x2={u*44} y2={v*44} stroke={d.checked && !currentEdges.has(edge) ? '#e87924' : '#415e48'} strokeWidth="2.6"/>; })}
          {d.checked && actual.map((v,i) => (v>=0)!==(clue[i]>=0) ? <rect key={i} x={i%3*44+5} y={Math.floor(i/3)*44+5} width="34" height="34" fill="none" stroke="#e87924" strokeWidth="3"/> : null)}
          {d.checked && [...currentEdges].filter(e=>!edges.includes(e)).map(edge=>{const [x,y,u,v]=edge.split(',').map(Number);return <line key={'extra'+edge} x1={x*44} y1={y*44} x2={u*44} y2={v*44} stroke="#e87924" strokeWidth="3" strokeDasharray="4 3"/>;})}
        </g>;
      })}
      <ellipse cx="380" cy="530" rx="184" ry="24" fill="#eaf0e3" opacity=".65" pointerEvents="none"/>
      {faces.map((face,k)=>{
        const lifting = carrying && drag.kind === 'cube' && drag.i === face.i && heights[face.i] > 0;
        return <g key={k} data-col={face.i} style={{cursor:d.revealed?'grab':'pointer'}}
          onPointerDown={e => d.revealed ? look(e) : begin(e, { kind: 'cube', i: face.i })}>
          <title>{face.i+1}: {heights[face.i]}</title>
          <polygon points={points(face.vertices)} fill={face.color} stroke={lifting ? BLUE : '#6c8976'} strokeWidth={lifting ? 2 : 1} opacity={lifting ? .6 : 1}/>
        </g>;
      })}
      {([[1.5,3.7,w.front]] as const).map(([x,y,label]) => {
        const [px,py] = direction(x,y);
        const [ex,ey] = direction(1.5+(x-1.5)*.72,1.5+(y-1.5)*.72);
        return <g key={label} fill="#6c8070" pointerEvents="none">
          <line x1={px} y1={py-14} x2={ex} y2={ey-14} stroke="#91a18e" strokeWidth="2"/>
          <circle cx={ex} cy={ey-14} r="3"/>
          <text x={px} y={py+5} textAnchor="middle" fontSize="14">{label}</text>
        </g>;
      })}

      {/* The tray a new cube is dragged from, and the bin a cube is dragged into (tap the bin to clear the floor). */}
      {!d.revealed && <g style={{ cursor: 'grab' }} onPointerDown={e => begin(e, { kind: 'new' })}>
        <title>{w.trayTitle}</title>
        <rect {...TRAY} width={TRAY.w} height={TRAY.h} rx={10} fill="#fff" stroke="#cfddc5" strokeWidth={1.5}/>
        <CubeIcon x={TRAY.x + TRAY.w / 2} y={TRAY.y + 42}/>
        <text x={TRAY.x + TRAY.w / 2} y={TRAY.y + TRAY.h - 12} fontSize={13} textAnchor="middle" fill="#58695c" pointerEvents="none">{w.add}</text>
      </g>}
      {!d.revealed && <Bin {...BIN} hot={overBin} label={w.clear} title={w.clearTitle} onTap={() => put(Array(9).fill(0))}/>}

      {/* Which puzzle: the one before and the one after. */}
      <Pill x={598} y={194} w={34} text="‹" title={w.previous} disabled={d.stage === 0} onTap={() => reset(d.stage - 1)}/>
      <text x={674} y={214} fontSize={14} textAnchor="middle" fill="#52694e">{puzzleText}</text>
      <Pill x={716} y={194} w={34} text="›" title={w.next} onTap={() => reset(d.stage + 1)}/>

      <Pill x={row1[0]} y={ROW1} w={44} text="↶" title={w.undo} disabled={!d.history.length || d.revealed}
        onTap={() => set({ ...d, heights: d.history.at(-1)!, history: d.history.slice(0, -1), checked: false })}/>
      <Pill x={row1[1]} y={ROW1} w={pillW(revealText)} text={revealText} title={d.revealed ? w.retry : w.reveal}
        onTap={() => set({ ...d, revealed: !d.revealed, checked: false })}/>
      <Pill x={row1[2]} y={ROW1} w={pillW(checkText) + 16} text={checkText} title={won ? w.next : w.check} strong disabled={d.revealed}
        onTap={() => won ? reset(d.stage + 1) : set({ ...d, checked: true })}/>
      <Tabs x={levelX} y={ROW2} keys={LEVELS} on={difficulty} names={w} onPick={pickLevel}/>
      <line x1={40} x2={W - 40} y1={ROW1 - 14} y2={ROW1 - 14} stroke="#e3e9de" pointerEvents="none"/>

      {carrying && <g pointerEvents="none">
        <CubeIcon x={drag.x} y={drag.y} ghost/>
        {drag.kind === 'cube' && overBin && <text x={drag.x} y={drag.y - 30} fontSize={13} textAnchor="middle" fill={MUTED}>−1</text>}
      </g>}
    </svg>
    <p className="views-gesture">{w.simpleDrag}</p>
    <p role="status" className={`views-feedback${won?' success':''}`}>{d.revealed?w.shown:d.checked?won?w.win:w.wrong:w.simpleHelp}</p>
  </>;
}
