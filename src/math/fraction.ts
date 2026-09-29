// Exact rational numbers for matrix work, so steps show 1/3 instead of 0.3333.

const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};

export class Frac {
  readonly n: number;
  readonly d: number;

  constructor(n: number, d = 1) {
    if (d === 0) throw new Error("division by zero");
    if (d < 0) [n, d] = [-n, -d];
    const g = gcd(n, d);
    this.n = n / g;
    this.d = d / g;
  }

  static readonly ZERO = new Frac(0);
  static readonly ONE = new Frac(1);

  /** Parses "3", "-2", "1/2", "-3/4", "0.25". Returns null for anything else. */
  static parse(src: string): Frac | null {
    const s = src.trim().replace(/\s+/g, "").replace(",", ".").replace("−", "-");
    let m = s.match(/^([-+]?\d+)$/);
    if (m) return new Frac(Number(m[1]));
    m = s.match(/^([-+]?\d+)\/(\d+)$/);
    if (m && Number(m[2]) !== 0) return new Frac(Number(m[1]), Number(m[2]));
    m = s.match(/^([-+]?)(\d*)\.(\d+)$/);
    if (m) {
      const scale = 10 ** m[3].length;
      const n = Number(m[2] || "0") * scale + Number(m[3]);
      return new Frac(m[1] === "-" ? -n : n, scale);
    }
    return null;
  }

  add(o: Frac) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o: Frac) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o: Frac) { return new Frac(this.n * o.n, this.d * o.d); }
  div(o: Frac) { return new Frac(this.n * o.d, this.d * o.n); }
  neg() { return new Frac(-this.n, this.d); }
  abs() { return new Frac(Math.abs(this.n), this.d); }
  isZero() { return this.n === 0; }
  isOne() { return this.n === 1 && this.d === 1; }
  isNeg() { return this.n < 0; }
  isInt() { return this.d === 1; }
  toNumber() { return this.n / this.d; }

  tex(): string {
    if (this.d === 1) return String(this.n);
    return `${this.n < 0 ? "-" : ""}\\frac{${Math.abs(this.n)}}{${this.d}}`;
  }

  /** LaTeX, parenthesized when negative (for use inside products). */
  texP(): string {
    return this.n < 0 ? `\\left(${this.tex()}\\right)` : this.tex();
  }
}
