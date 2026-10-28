// Zeno's mark: a bar cut in halves, each piece half the one before; the last, still to cover, in marker yellow.
export function ZenoMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="z-mark" width={size * 2.5} height={size} viewBox="0 0 40 16" aria-hidden="true">
      <rect x="0" y="0" width="19" height="16" rx="2" fill="currentColor" />
      <rect x="21" y="0" width="9" height="16" rx="2" fill="currentColor" />
      <rect x="32" y="0" width="4" height="16" rx="1.5" fill="currentColor" />
      <rect x="38" y="0" width="2" height="16" rx="1" fill="var(--z-marker)" />
    </svg>
  );
}
