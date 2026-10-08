// A timed session's clock. It keeps its own time, so its tick re-renders this line and not the page around it.
import { useEffect, useState } from "react";

export const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function Countdown({ until, left, ended, className = "practice-clock" }: {
  /** When the session ends (ms since the epoch). */
  until: number;
  /** The line while time is left, given the time as m:ss. */
  left: (time: string) => string;
  /** The line once it is up; nothing shows if left out. */
  ended?: string;
  className?: string;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  if (now >= until && ended === undefined) return null;
  return (
    <strong className={className} role="timer">
      {now < until ? left(clock(until - now)) : ended}
    </strong>
  );
}
