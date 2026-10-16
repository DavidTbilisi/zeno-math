// The answer to "how many dots?": the dots show for a moment when Look is pressed, then hide, and the number is typed
// (or tapped). One look per try: after a wrong answer, another; once the question is done, the dots stay.
import { useEffect, useRef, useState } from "react";
import { LOOK_W } from "../math/quickLook";

export function FlashAnswer({ play, value, onChange, disabled, label, tone, onEnter, look }: {
  play: { ms: number; body: string; h: number };
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  tone?: "right" | "wrong" | null;
  onEnter?: () => void;
  look: string;
}) {
  const [phase, setPhase] = useState<"ready" | "look" | "hidden">("ready");
  const [looked, setLooked] = useState(0);
  // A wrong answer earns another look.
  const [lookedAtWrong, setLookedAtWrong] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const canLook = phase !== "look" && !disabled && (looked === 0 || (tone === "wrong" && !lookedAtWrong));
  const show = () => {
    if (tone === "wrong") setLookedAtWrong(true);
    setLooked((n) => n + 1);
    setPhase("look");
    timer.current = setTimeout(() => setPhase("hidden"), play.ms);
  };
  const visible = phase === "look" || disabled;
  return (
    <div className="geo-answer flash-answer">
      <svg width={LOOK_W} height={play.h} viewBox={`0 0 ${LOOK_W} ${play.h}`} role="img" aria-label={label} className="flash-box">
        <rect width={LOOK_W} height={play.h} rx={10} fill={visible ? "#fff" : "#f1f3f5"} />
        {visible ? <g dangerouslySetInnerHTML={{ __html: play.body }} /> : (
          <text x={LOOK_W / 2} y={play.h / 2 + 18} fontSize={52} textAnchor="middle" fill="#adb5bd">{phase === "ready" ? "👀" : "?"}</text>
        )}
      </svg>
      <div className="field-row">
        <button className="btn" disabled={!canLook} onClick={show}>👀 {look}</button>
        <input
          className="mono practice-input flash-input"
          inputMode="numeric"
          autoComplete="off"
          aria-label={label}
          value={value}
          disabled={disabled || looked === 0}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            onEnter?.();
          }}
        />
      </div>
    </div>
  );
}
