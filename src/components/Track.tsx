// A progress bar in two parts: what is done, then what is behind the learner (below their grade, so taken as known).
export function Track({ p }: { p: { done: number; behind: number; total: number } }) {
  const pc = (n: number) => (p.total ? (100 * n) / p.total : 0);
  return (
    <div className="course-track" aria-hidden="true">
      <span className="secure" style={{ width: `${pc(p.done)}%` }} />
      <span className="behind" style={{ width: `${pc(p.behind)}%` }} />
    </div>
  );
}
