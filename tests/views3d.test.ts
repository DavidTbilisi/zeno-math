import { test } from 'node:test';
import assert from 'node:assert/strict';
import { project, viewsPuzzle, cameraPoint, rotateViewPoint, viewEdges, solidMatches, viewMatches, VIEW_PUZZLES } from '../src/math/views3d.ts';

test('front looks from the front row; right view puts the front on the left', () => {
  const h = [0,0,3, 0,0,0, 1,0,0];
  assert.deepEqual(project(h,'front'), [-1,-1,0, -1,-1,0, 2,-1,0]);
  assert.deepEqual(project(h,'side'), [-1,-1,2, -1,-1,2, 0,-1,2]);
});
test('a flat face has no internal cube seams, while a height step has an edge', () => {
  assert.equal(viewEdges(project(Array(9).fill(2),'top')).length,12);
  const h = Array(9).fill(2); h[4]=1;
  assert.equal(viewEdges(project(h,'top')).length,16);
  assert.equal(viewMatches(h,Array(9).fill(2),'top'),false);
});
test('different solids with identical visible views are accepted', () => {
  const a = [3,3,3, 3,2,3, 3,3,3];
  const b = [3,3,3, 3,1,3, 3,3,3];
  assert.equal(solidMatches(a,b),true);
});
test('every puzzle accepts itself and rejects an empty workspace', () => {
  for (const puzzle of VIEW_PUZZLES) {
    assert.equal(solidMatches(puzzle,puzzle),true);
    assert.equal(solidMatches(puzzle,Array(9).fill(0)),false);
    assert.ok(puzzle.every(h=>Number.isInteger(h)&&h>=0&&h<=3));
  }
});

test('camera rotation preserves stack identities and returns after four turns', () => {
  for (let i = 0; i < 9; i++) {
    const start: [number, number] = [i % 3 + .5, Math.floor(i / 3) + .5];
    let p = start;
    for (let turn = 0; turn < 4; turn++) p = rotateViewPoint(...p, 1);
    assert.deepEqual(p, start);
    assert.deepEqual(rotateViewPoint(...start, -1), rotateViewPoint(...start, 3));
  }
  for (let turn = 0; turn < 4; turn++) {
    const cells = Array.from({ length: 9 }, (_, i) => rotateViewPoint(i % 3 + .5, Math.floor(i / 3) + .5, turn).join(','));
    assert.equal(new Set(cells).size, 9);
  }
  assert.deepEqual(rotateViewPoint(1.5, 3.5, 1), [-.5, 1.5]);
});

test('drag rotation preserves distance and is reversible between quarter turns', () => {
  const p: [number,number] = [.5,2.5];
  for (const turn of [.2,.5,1.7,-.3]) {
    const rotated=rotateViewPoint(...p,turn);
    const restored=rotateViewPoint(...rotated,-turn);
    assert.ok(Math.abs(restored[0]-p[0])<1e-10);
    assert.ok(Math.abs(restored[1]-p[1])<1e-10);
    assert.ok(Math.abs(Math.hypot(rotated[0]-1.5,rotated[1]-1.5)-Math.SQRT2)<1e-10);
  }
});

test('three-axis camera preserves 3D distances at top, bottom and rolled views', () => {
  for (const yaw of [0,.3,1,2.7]) for (const tilt of [-180,-90,0,35.264,90,180]) for (const roll of [-180,-45,0,90]) {
    const a=cameraPoint(0,0,0,yaw,tilt,roll), b=cameraPoint(3,3,3,yaw,tilt,roll);
    assert.ok(Math.abs(Math.hypot(...a.map((v,i)=>v-b[i]))-Math.sqrt(27))<1e-10);
  }
  assert.ok(cameraPoint(1.5,1.5,3,0,90,0)[2]>cameraPoint(1.5,1.5,0,0,90,0)[2]);
  assert.ok(cameraPoint(1.5,1.5,3,0,-90,0)[2]<cameraPoint(1.5,1.5,0,0,-90,0)[2]);
});

test('endless puzzles are deterministic, connected, varied and solvable beyond the introductory set', () => {
  const unique = new Set<string>();
  for(let stage=8;stage<2008;stage++) {
    const h=viewsPuzzle(stage,1234);
    assert.deepEqual(h,viewsPuzzle(stage,1234));
    assert.equal(h.length,9);
    assert.ok(h.every(n=>Number.isInteger(n) && n>=0 && n<=3));
    const cells=h.flatMap((n,i)=>n ? [i] : []);
    assert.ok(cells.length>=4);
    assert.ok(new Set(cells.map(i=>h[i])).size>1);
    const reached=new Set([cells[0]]), queue=[cells[0]];
    while(queue.length) {
      const i=queue.shift()!;
      for(const j of cells) if(!reached.has(j) && Math.abs(i%3-j%3)+Math.abs(Math.floor(i/3)-Math.floor(j/3))===1) {
        reached.add(j); queue.push(j);
      }
    }
    assert.equal(reached.size,cells.length);
    assert.equal(solidMatches(h,h),true);
    assert.equal(solidMatches(h,Array(9).fill(0)),false);
    unique.add(h.join(','));
  }
  assert.ok(unique.size>1500, `only ${unique.size} different puzzles`);
  assert.notDeepEqual(viewsPuzzle(500,1234),viewsPuzzle(500,5678));
  assert.ok(viewsPuzzle(1000000).some(h=>h>0));
});
test('saved introductory boards retain their target and generators return fresh arrays', () => {
  for(let stage=0;stage<VIEW_PUZZLES.length;stage++) assert.deepEqual(viewsPuzzle(stage),VIEW_PUZZLES[stage]);
  const h=viewsPuzzle(800);h.fill(0);
  assert.ok(viewsPuzzle(800).some(n=>n>0));
});

test('selected difficulties remain within their limits at every puzzle number', () => {
  for(const mode of ['easy','medium','hard'] as const) {
    const unique=new Set<string>();
    for(let stage=0;stage<200;stage++) {
      const h=viewsPuzzle(stage,42,mode), count=h.filter(Boolean).length;
      assert.deepEqual(h,viewsPuzzle(stage,42,mode));
      assert.equal(solidMatches(h,h),true);
      if(mode==='easy') { assert.ok(count>=3 && count<=4); assert.equal(Math.max(...h),1); }
      if(mode==='medium') { assert.ok(count>=4 && count<=6); assert.equal(Math.max(...h),2); }
      if(mode==='hard') { assert.ok(count>=7 && count<=9); assert.equal(Math.max(...h),3); }
      unique.add(h.join(','));
    }
    assert.ok(unique.size>30);
  }
});
