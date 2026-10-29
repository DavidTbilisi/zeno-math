// The board bar's icons, drawn in one hand: a 20-unit square, 1.8 strokes in the text's colour, round ends.
const PATHS = {
  search: <><circle cx="8.5" cy="8.5" r="5.5" /><path d="M12.6 12.6 17 17" /></>,
  shapes: <><rect x="3" y="9" width="8" height="8" rx="1" /><circle cx="13" cy="7" r="4" /></>,
  arithmetic: <><path d="M3.5 6h6M6.5 3v6M12 6h5M4 12.5l4 4M8 12.5l-4 4M12 14.5h5" /><circle cx="14.5" cy="12" r=".6" /><circle cx="14.5" cy="17" r=".6" /></>,
  geometry: <><path d="M3 17h14L3 5z" /><path d="M3 13.5h3.5V17" /></>,
  algebra: <path d="M15 4H5l5 6-5 6h10" />,
  discrete: <><path d="M6.6 6.4 13.4 7M6 7l2.4 6.3M14.2 8.2l-4 5.5" /><circle cx="5" cy="5.5" r="2" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="15" r="2" /></>,
  ai: <path d="M3 4h14l-7 13z" />,
  practice: <g fill="currentColor" stroke="none"><rect x="2" y="7" width="8" height="6" rx="1" /><rect x="11" y="7" width="4" height="6" rx="1" /><rect x="16" y="7" width="2" height="6" rx=".6" /></g>,
  games: <path d="m10 2.8 2.1 4.6 5 .5-3.8 3.4 1.1 4.9L10 13.7l-4.4 2.5 1.1-4.9-3.8-3.4 5-.5z" />,
  share: <path d="M8.3 11.7l3.4-3.4M9 6.5l1.4-1.4a3 3 0 0 1 4.3 4.3L13.3 10.8M11 13.5l-1.4 1.4a3 3 0 0 1-4.3-4.3L6.7 9.2" />,
  edit: <path d="M4 16l1-4 8-8 3 3-8 8zM11.5 5.5l3 3" />,
};
export type BarIconName = keyof typeof PATHS;

export function BarIcon({ name }: { name: BarIconName }) {
  return (
    <svg className="bar-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
