import { useRef, useState } from 'react';
import { project, cameraPoint, solidMatches, viewsPuzzle, viewEdges, viewMatches, type View } from '../math/views3d';
import { FONT, svgPoint, type PieceProps } from './ui';

export function Views3d({ state: d, set, w: words, svgRef }: PieceProps<'views3d'>) {
  const w = words.views3d;
  const [remove, setRemove] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [tilt, setTilt] = useState(35.264);
  const [roll, setRoll] = useState(0);
  const drag = useRef<{ pointer: number; x: number; y: number; rotation: number; tilt: number; roll: number; moved: boolean; rolling: boolean } | null>(null);
  const target = viewsPuzzle(d.stage, d.seed, d.difficulty);
  const difficulty = d.difficulty ?? (Math.max(...target) <= 1 ? 'easy' : Math.max(...target) <= 2 ? 'medium' : 'hard');
  const heights = d.revealed ? target : d.heights;
  const won = d.checked && solidMatches(d.heights, target);
  const change = (i: number, delta: number) => {
    if (d.revealed) return;
    const h = Math.max(0, Math.min(3, d.heights[i] + delta));
    if (h === d.heights[i]) return;
    set({ ...d, heights: d.heights.map((v,k) => k === i ? h : v), history: [...d.history.slice(-49), d.heights], checked: false });
  };
  const reset = (stage = d.stage) => set({ stage, difficulty: d.difficulty, seed: d.seed, heights: Array(9).fill(0), history: [], checked: false, revealed: false });
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
  return <>
    <div className="views-heading"><b>{w.title}</b><span className="views-badge">{w.puzzle} {d.stage + 1}</span></div>
    <div className="views-difficulty" role="group" aria-label={w.difficulty}>
      {(['easy','medium','hard'] as const).map(mode=><button key={mode} className={`live-btn${difficulty===mode?' on':''}`} aria-pressed={difficulty===mode} onClick={()=>{
        if(mode===difficulty) return;
        set({ stage:0, seed:d.seed, difficulty:mode, heights:Array(9).fill(0), history:[], checked:false, revealed:false });
        setRotation(0);setTilt(35.264);setRoll(0);
      }}>{w[mode]}</button>)}
    </div>
    <p className="views-intro">{w.prompt}</p>
    <svg ref={svgRef} width="720" height="587" viewBox="0 0 760 620" fontFamily={FONT} role="group" aria-label={w.title}
      onPointerDown={e=>{
        if (!e.isPrimary || e.button !== 0 || svgPoint(e.currentTarget,e)[1] < 190) return;
        const [x,y]=svgPoint(e.currentTarget,e);
        drag.current = { pointer:e.pointerId, x, y, rotation, tilt, roll, moved:false, rolling:e.shiftKey };
      }}
      onPointerMove={e=>{
        const start=drag.current;
        if (!start || start.pointer!==e.pointerId || !(e.buttons & 1)) return;
        const [x,y]=svgPoint(e.currentTarget,e), dx=x-start.x, dy=y-start.y;
        if (Math.hypot(dx,dy)>5) { start.moved=true; e.currentTarget.setPointerCapture(e.pointerId); }
        if (start.moved) {
          if(start.rolling) setRoll(start.roll+dx*.6);
          else { setRotation(start.rotation-dx/140); setTilt(start.tilt+dy*.6); }
        }
      }}
      onPointerUp={e=>{
        if (drag.current) drag.current.pointer=-1;
        if(e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={()=>{drag.current=null;}}
    >
      <rect width="760" height="620" rx="12" fill="#fafbf7"/>
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
      <ellipse cx="380" cy="530" rx="184" ry="24" fill="#eaf0e3" opacity=".65"/>
      {faces.map((face,k)=>{
        return <g key={k} onClick={()=>{if(!drag.current?.moved) change(face.i,remove?-1:1);}} style={{cursor:d.revealed?'grab':'pointer'}}>
          <title>{face.i+1}: {heights[face.i]}</title>
          <polygon points={points(face.vertices)} fill={face.color} stroke="#6c8976" strokeWidth="1"/>
        </g>;
      })}
      {([[1.5,3.7,w.front]] as const).map(([x,y,label]) => {
        const [px,py] = direction(x,y);
        const [ex,ey] = direction(1.5+(x-1.5)*.72,1.5+(y-1.5)*.72);
        return <g key={label} fill="#6c8070">
          <line x1={px} y1={py-14} x2={ex} y2={ey-14} stroke="#91a18e" strokeWidth="2"/>
          <circle cx={ex} cy={ey-14} r="3"/>
          <text x={px} y={py+5} textAnchor="middle" fontSize="14">{label}</text>
        </g>;
      })}
    </svg>
    <p className="views-gesture">{w.simpleDrag}</p>
    <div className="live-bar views-build-tools">
      <button className={`live-btn${!remove?' on':''}`} aria-pressed={!remove} onClick={()=>setRemove(false)}>＋ {w.add}</button>
      <button className={`live-btn${remove?' on':''}`} aria-pressed={remove} onClick={()=>setRemove(true)}>− {w.remove}</button>
      <button className="live-btn" disabled={!d.history.length||d.revealed} onClick={()=>set({...d,heights:d.history.at(-1)!,history:d.history.slice(0,-1),checked:false})}>↶ {w.undo}</button>
    </div>
    <p role="status" className={`views-feedback${won?' success':''}`}>{d.revealed?w.shown:d.checked?won?w.win:w.wrong:w.simpleHelp}</p>
    <div className="live-bar views-actions">
      <button className="live-btn views-check" disabled={d.revealed} onClick={()=>set({...d,checked:true})}>{w.check}</button>
      <button className="live-btn" onClick={()=>reset(d.stage+1)}>{w.next} →</button>
    </div>
    <div className="live-bar views-secondary">
      <button className="live-btn" onClick={()=>set({...d,revealed:!d.revealed,checked:false})}>{d.revealed?w.retry:w.reveal}</button>
      <button className="live-btn" disabled={d.stage===0} onClick={()=>reset(d.stage-1)}>← {w.previous}</button>
    </div>
  </>;
}
