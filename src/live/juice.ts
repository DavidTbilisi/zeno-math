// Small sounds made in code, no files: a tick when a corner lands on a dot, a rising chord for a right answer (pitched
// up a semitone for every answer of a streak, so a run of right answers climbs), a sparkle for a star, a soft low note
// for a miss, a quick run up for a streak worth a cheer and a held chord for three stars or a ladder done. Off when the
// viewer turns them off (kept in this browser), and nothing is made until the first sound is asked for, which is
// always after a tap (browsers want a gesture first).
export type Sound = "snap" | "good" | "star" | "miss" | "streak" | "levelup";

const KEY = "zeno.sound.v1";
let ctx: AudioContext | null = null;

export function muted(): boolean {
  try {
    return localStorage.getItem(KEY) === "off";
  } catch {
    return false;
  }
}
export function setMuted(off: boolean) {
  try {
    if (off) localStorage.setItem(KEY, "off");
    else localStorage.removeItem(KEY);
  } catch {
    // private mode: the choice lasts until the page closes
  }
}

/** Each sound as notes: frequency (Hz), when it starts and how long it rings (s), and its wave. */
const NOTES: Record<Sound, { f: number; at: number; len: number; wave: OscillatorType; vol: number }[]> = {
  snap: [{ f: 1320, at: 0, len: 0.05, wave: "triangle", vol: 0.12 }],
  good: [523.25, 659.25, 783.99].map((f, i) => ({ f, at: i * 0.08, len: 0.22, wave: "sine" as const, vol: 0.18 })),
  star: [1046.5, 1318.5, 1568, 2093].map((f, i) => ({ f, at: i * 0.06, len: 0.18, wave: "triangle" as const, vol: 0.12 })),
  miss: [{ f: 196, at: 0, len: 0.25, wave: "sine", vol: 0.15 }],
  streak: [392, 523.25, 659.25, 783.99, 1046.5].map((f, i) => ({ f, at: i * 0.05, len: 0.15, wave: "triangle" as const, vol: 0.12 })),
  levelup: [523.25, 659.25, 783.99, 1046.5].map((f, i) => ({ f, at: i * 0.1, len: i === 3 ? 0.5 : 0.2, wave: "sine" as const, vol: 0.18 })),
};

/** Plays a sound, `pitch` semitones higher than written (at most an octave). */
export function play(sound: Sound, o: { pitch?: number } = {}) {
  if (muted()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    const up = 2 ** (Math.max(0, Math.min(12, o.pitch ?? 0)) / 12);
    for (const n of NOTES[sound]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.wave;
      osc.frequency.value = n.f * up;
      // A quick rise and a fall, so no note clicks.
      gain.gain.setValueAtTime(0, t0 + n.at);
      gain.gain.linearRampToValueAtTime(n.vol, t0 + n.at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.len + 0.02);
    }
  } catch {
    // no audio here (an old browser, a test): silence
  }
}
