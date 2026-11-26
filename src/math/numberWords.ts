// Whole numbers below a million and decimals to thousandths in words, in English, Georgian and Russian: what a
// student reads in "write in figures: three thousand and forty-two". Georgian counts in twenties (ორმოცდაორი is
// "two twenties and two"); Russian thousands and fractions change their ending with the number before them.

export type NumberLang = "en" | "ka" | "ru";

const EN_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function en(n: number): string {
  if (n < 20) return EN_ONES[n];
  if (n < 100) return EN_TENS[Math.floor(n / 10)] + (n % 10 ? `-${EN_ONES[n % 10]}` : "");
  if (n < 1000) {
    const rest = n % 100;
    return `${EN_ONES[Math.floor(n / 100)]} hundred${rest ? ` and ${en(rest)}` : ""}`;
  }
  const rest = n % 1000;
  return `${en(Math.floor(n / 1000))} thousand${rest ? (rest < 100 ? ` and ${en(rest)}` : ` ${en(rest)}`) : ""}`;
}

const KA_ONES = ["ნული", "ერთი", "ორი", "სამი", "ოთხი", "ხუთი", "ექვსი", "შვიდი", "რვა", "ცხრა", "ათი", "თერთმეტი", "თორმეტი", "ცამეტი", "თოთხმეტი", "თხუთმეტი", "თექვსმეტი", "ჩვიდმეტი", "თვრამეტი", "ცხრამეტი"];
/** Twenty, forty, sixty, eighty, and the stems that take "და" and the rest: ოცდა-, ორმოცდა-. */
const KA_SCORES = ["", "ოცი", "ორმოცი", "სამოცი", "ოთხმოცი"];
const KA_HUNDREDS = ["", "ასი", "ორასი", "სამასი", "ოთხასი", "ხუთასი", "ექვსასი", "შვიდასი", "რვაასი", "ცხრაასი"];
/** A Georgian number word before what follows it loses its final ი: ასი → ას ოცი, ათასი → ათას ორი. */
const stem = (word: string) => word.replace(/ი$/, "");

function ka(n: number): string {
  if (n < 20) return KA_ONES[n];
  if (n < 100) {
    const [s, rest] = [Math.floor(n / 20), n % 20];
    return rest ? `${stem(KA_SCORES[s])}და${KA_ONES[rest]}` : KA_SCORES[s];
  }
  if (n < 1000) {
    const rest = n % 100;
    const h = KA_HUNDREDS[Math.floor(n / 100)];
    return rest ? `${stem(h)} ${ka(rest)}` : h;
  }
  const [t, rest] = [Math.floor(n / 1000), n % 1000];
  const thousand = t === 1 ? "ათასი" : `${ka(t)} ათასი`;
  return rest ? `${stem(thousand)} ${ka(rest)}` : thousand;
}

const RU_ONES = ["ноль", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять", "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
const RU_TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const RU_HUNDREDS = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

/** The Russian form a noun takes after n: one (1, 21), few (2–4, 22–24) or many (5–20, 25–30, 11–14). */
function ruForm<T>(n: number, one: T, few: T, many: T): T {
  const [d, dd] = [n % 10, n % 100];
  if (dd >= 11 && dd <= 14) return many;
  return d === 1 ? one : d >= 2 && d <= 4 ? few : many;
}

/** Below a thousand; `fem` for a feminine noun after it (одна тысяча, две сотых). */
function ruSmall(n: number, fem = false): string {
  const words: string[] = [];
  if (n >= 100) words.push(RU_HUNDREDS[Math.floor(n / 100)]);
  const rest = n % 100;
  if (rest >= 20) {
    words.push(RU_TENS[Math.floor(rest / 10)]);
    if (rest % 10) words.push(ruUnit(rest % 10, fem));
  } else if (rest > 0 || n === 0) words.push(ruUnit(rest, fem));
  return words.join(" ");
}
const ruUnit = (d: number, fem: boolean) => (fem && d === 1 ? "одна" : fem && d === 2 ? "две" : RU_ONES[d]);

function ru(n: number, fem = false): string {
  if (n < 1000) return ruSmall(n, fem);
  const [t, rest] = [Math.floor(n / 1000), n % 1000];
  const thousands = `${ruSmall(t, true)} ${ruForm(t, "тысяча", "тысячи", "тысяч")}`;
  return rest ? `${thousands} ${ruSmall(rest, fem)}` : thousands;
}

/** n (a whole number, 0 ≤ n < 1 000 000) in words. */
export function numberInWords(n: number, lang: NumberLang): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1e6) throw new Error(`no words for ${n}`);
  return lang === "en" ? en(n) : lang === "ka" ? ka(n) : ru(n);
}

const EN_PLACES = ["tenth", "hundredth", "thousandth"];
const KA_PLACES = ["მეათედი", "მეასედი", "მეათასედი"];
const RU_PLACES: [string, string][] = [["десятая", "десятых"], ["сотая", "сотых"], ["тысячная", "тысячных"]];

/**
 * whole + f/10^p in words (p 1 to 3, 0 < f < 10^p): "three and seven hundredths", "სამი მთელი შვიდი მეასედი",
 * "три целых семь сотых". With no whole part English says only the fraction; Georgian and Russian say the nought.
 */
export function decimalInWords(whole: number, f: number, p: 1 | 2 | 3, lang: NumberLang): string {
  if (lang === "en") {
    const frac = `${en(f)} ${EN_PLACES[p - 1]}${f === 1 ? "" : "s"}`;
    return whole ? `${en(whole)} and ${frac}` : frac;
  }
  if (lang === "ka") return `${ka(whole)} მთელი ${ka(f)} ${KA_PLACES[p - 1]}`;
  const [one, many] = RU_PLACES[p - 1];
  return `${ru(whole, true)} ${ruForm(whole, "целая", "целых", "целых")} ${ru(f, true)} ${ruForm(f, one, many, many)}`;
}
