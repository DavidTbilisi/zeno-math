// The code view's colours, shared by the Algorithms tool's code pictures and the games: every variable keeps one colour
// wherever it shows (its ↑ under the array, the cell it points at, its name in the code and the variables), and the
// code is highlighted the way an editor does it. The colours only ever repeat what the names already say.
import { C } from "./chart";

export const VAR_COLORS: Record<string, string> = {
  i: C.blue,
  j: C.orange,
  "j+1": C.orange,
  "j-gap": C.orange,
  k: C.purple,
  m: "#c2255c",
  lo: C.green,
  hi: "#c2255c",
  mid: C.purple,
  key: "#0c8599",
  p: "#c2255c",
  end: "#5c7cfa",
  l: "#0c8599",
  r: C.orange,
  big: "#c2255c",
  gap: C.purple,
  x: "#0c8599",
  out: C.green,
  c: C.green,
  L: C.blue,
  R: C.orange,
  swapped: "#5c7cfa",
};
export const varColor = (name: string): string => VAR_COLORS[name] ?? "#495057";

const KEYWORDS = new Set(["for", "in", "while", "if", "elif", "else", "return", "def", "break", "and", "or", "not", "True", "False", "None", "lambda"]);
const BUILTINS = new Set(["range", "len", "min", "max", "append", "pop", "insert", "print", "sort", "quick", "sift"]);

export type Token = { text: string; color: string; bold?: boolean };

// ---------- aliases ----------

/** Names given to the code's variables: i → left, j → scan. The variable keeps its colour under its new name. */
export type Names = Record<string, string>;

/** A name the code may take: a letter or _ first (any alphabet, so слева and მარცხნივ too), then letters, digits, _. */
const IDENT = /^[\p{L}_][\p{L}\p{N}_]*$/u;
/** Long names would push the pointers over each other and the code past its box. */
export const NAME_MAX = 10;

/**
 * Aliases written as "i = left, j = scan" (commas, semicolons or new lines between, = or → or : inside). Blank is no
 * aliases. The first part that is not a pair of names, or gives a keyword or a built-in, comes back as bad.
 */
export function parseNames(text: string | undefined): { names: Names; bad?: string } {
  const names: Names = {};
  for (const raw of (text ?? "").split(/[,;\n]/)) {
    const part = raw.trim();
    if (!part) continue;
    const m = part.match(/^(\S+?)\s*(?:=|→|->|:)\s*(\S+)$/u);
    if (!m) return { names, bad: part };
    const [, from, to] = m;
    if (!IDENT.test(from) || !IDENT.test(to) || to.length > NAME_MAX || KEYWORDS.has(to) || BUILTINS.has(to) || KEYWORDS.has(from)) return { names, bad: part };
    if (from !== to) names[from] = to;
  }
  return { names };
}

/**
 * Whether the name at s[at:end] is one an alias renames: given an alias, and not a keyword argument (key=…, written
 * without spaces, unlike an assignment key = …), which names the function's parameter rather than a variable.
 */
const renames = (names: Names, w: string, s: string, end: number) => Object.hasOwn(names, w) && !(s[end] === "=" && s[end + 1] !== "=");

/** The code with its variables renamed, whole names only: with i → left, a[i] and i += 1 change but min and in do not. */
export const rename = (s: string, names: Names): string =>
  Object.keys(names).length ? s.replace(/[A-Za-z_]\w*/g, (w, at: number) => (renames(names, w, s, at + w.length) ? names[w] : w)) : s;

/** A line of code cut into coloured pieces: keywords, built-ins, numbers, the variables in their own colours, the rest. */
export function highlight(line: string, names: Names = {}): Token[] {
  const out: Token[] = [];
  const re = /(\s+)|([A-Za-z_]\w*)|(\d+(?:\.\d+)?)|(#.*$)|(.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const [all, space, word, num, comment] = m;
    if (space) out.push({ text: space, color: C.ink });
    else if (word && renames(names, word, line, re.lastIndex)) out.push({ text: names[word], color: varColor(word), bold: true });
    else if (word)
      out.push(
        KEYWORDS.has(word) ? { text: word, color: word === "True" ? C.green : word === "False" ? C.red : "#9c36b5", bold: true }
        : BUILTINS.has(word) ? { text: word, color: "#1864ab" }
        : word in VAR_COLORS ? { text: word, color: VAR_COLORS[word], bold: true }
        : { text: word, color: C.ink },
      );
    else if (num) out.push({ text: num, color: "#d9480f" });
    else if (comment) out.push({ text: comment, color: C.grey });
    else out.push({ text: all, color: "#868e96" });
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The pieces as SVG tspans, for inside a <text xml:space="preserve">. */
export const tspans = (tokens: Token[]) => tokens.map((t) => `<tspan fill="${t.color}"${t.bold ? ` font-weight="700"` : ""}>${esc(t.text)}</tspan>`).join("");
