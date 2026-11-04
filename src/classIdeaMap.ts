// The ideas lit on a class student's idea map, kept in this browser under the student's code, so a tile lit stays lit
// even when a later answer lowers the estimate (ideaMap.ts). The class plan's estimates live on the server; on another
// device the map lights again from them, without what had lit and gone back under the bar.
const KEY = "zeno.classIdeas.v1";

function stored(): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The ideas lit for this student in this browser. */
export function loadClassLit(code: string): string[] {
  const v = stored()[code];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function keepClassLit(code: string, lit: readonly string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...stored(), [code]: lit }));
  } catch {
    // private mode: next visit the map lights from the model's estimates alone
  }
}
