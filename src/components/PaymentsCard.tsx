// The teacher's payments (#757, server/payments.ts): the class's lesson price, the register for a month (one column per
// lesson, a tick for each student who came) and the payments recorded. Each student's row shows the month's lessons,
// what they cost and what was paid, and the balance over all months; the last row is the whole class. The sums are
// src/model/payments.ts, the same the server uses for what each student sees on their own site.
import { useEffect, useMemo, useState } from "react";
import { studentName, type ClassPayments, type ClassSummary, type Dashboard, type teacherApi } from "../api";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";
import { monthOf, money, parseMoney, paySummary, type PayLine } from "../model/payments";

const CURRENCIES = ["GEL", "USD", "EUR", "GBP", "RUB", "UAH", "TRY", "AMD", "AZN", "KZT"];
const pad = (n: number) => String(n).padStart(2, "0");
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function PaymentsCard({ klass, data, api, t, lang, showCodes }: {
  klass: ClassSummary;
  data: Dashboard;
  api: ReturnType<typeof teacherApi>;
  t: Dict;
  lang: string;
  showCodes: boolean;
}) {
  const w = t.site.teach;
  const [pay, setPay] = useState<ClassPayments | null>(null);
  const [month, setMonth] = useState(() => monthOf(today()));
  const [priceText, setPriceText] = useState("");
  const [currency, setCurrency] = useState("GEL");
  const [day, setDay] = useState(today);
  const [who, setWho] = useState("");
  const [amountText, setAmountText] = useState("");
  const [payDay, setPayDay] = useState(today);
  const [note, setNote] = useState("");
  const [badAmount, setBadAmount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    api.payments(klass.code).then((p) => {
      if (!live) return;
      setPay(p);
      setCurrency(p.currency);
      if (p.price !== null) setPriceText(String(p.price / 100));
    }, () => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [api, klass.code]);

  const students = data.students;
  const ids = useMemo(() => students.map((s) => s.id), [students]);
  const summary = useMemo(() => (pay ? paySummary(ids, pay.lessons, pay.payments, month) : null), [ids, pay, month]);
  if (!pay || !summary) return failed ? <p className="error" role="alert">{w.payFailed}</p> : null;

  const cur = pay.currency;
  const m = (minor: number) => money(minor, cur, lang);
  const lessons = pay.lessons.filter((l) => monthOf(l.day) === month);
  const paidInMonth = pay.payments.filter((p) => monthOf(p.day) === month);
  const nameOf = (id: string) => {
    const s = students.find((x) => x.id === id);
    return studentName(id, s, showCodes ? s?.code : undefined);
  };
  const shortDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(lang, { day: "numeric", month: "short" });
  const owedCell = (line: PayLine) =>
    line.owed > 0 ? <td className="pay-owed">{m(line.owed)}</td>
      : line.owed < 0 ? <td className="pay-ahead">{fill(w.payAhead, { amount: m(-line.owed) })}</td>
        : <td className="pay-clear">{line.due || line.paid ? `✓ ${w.payClear}` : "–"}</td>;

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    try {
      await job();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  const savePrice = () => {
    const price = parseMoney(priceText);
    if (price === null) return setBadAmount(true);
    setBadAmount(false);
    void run(async () => {
      const p = await api.price(klass.code, price, currency);
      setPay({ ...pay, ...p });
    });
  };
  const addLesson = () => void run(async () => {
    const lesson = await api.register(klass.code, { day, present: [] });
    setPay({ ...pay, lessons: [...pay.lessons, lesson].sort((a, b) => a.day.localeCompare(b.day) || a.id - b.id) });
    setMonth(monthOf(day));
  });
  // The tick shows at once and is taken back if the save fails.
  const tick = (id: number, student: string, came: boolean) => {
    const before = pay;
    const old = pay.lessons.find((l) => l.id === id)!;
    const present = came ? [...old.present, student] : old.present.filter((s) => s !== student);
    setPay({ ...pay, lessons: pay.lessons.map((l) => (l.id === id ? { ...l, present } : l)) });
    void run(async () => {
      try {
        const lesson = await api.register(klass.code, { id, day: old.day, present });
        setPay((p) => p && { ...p, lessons: p.lessons.map((l) => (l.id === id ? lesson : l)) });
      } catch (err) {
        setPay(before);
        throw err;
      }
    });
  };
  const removeLesson = (id: number) => void run(async () => {
    await api.unregister(klass.code, id);
    setPay({ ...pay, lessons: pay.lessons.filter((l) => l.id !== id) });
  });
  const record = () => {
    const amount = parseMoney(amountText);
    if (amount === null || amount === 0 || !who) return setBadAmount(true);
    setBadAmount(false);
    void run(async () => {
      const p = await api.pay(klass.code, { student: who, amount, day: payDay, note: note || undefined });
      setPay({ ...pay, payments: [...pay.payments, p] });
      setAmountText("");
      setNote("");
      setMonth(monthOf(payDay));
    });
  };
  const unpay = (id: number) => void run(async () => {
    await api.unpay(klass.code, id);
    setPay({ ...pay, payments: pay.payments.filter((p) => p.id !== id) });
  });

  return (
    <section className="card pay-card" aria-labelledby="pay-title">
      <h3 id="pay-title">{w.pay}</h3>
      <p className="hint">{w.payHint}</p>

      <div className="field-row wrap">
        <label className="field-row">
          <span>{w.payPrice}</span>
          <input inputMode="decimal" value={priceText} style={{ width: 90 }} onChange={(e) => setPriceText(e.target.value)} aria-invalid={badAmount && parseMoney(priceText) === null} />
        </label>
        <label className="field-row">
          <span>{w.payCurrency}</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {[...new Set([currency, ...CURRENCIES])].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button className="btn small" disabled={busy} onClick={savePrice}>{w.paySavePrice}</button>
      </div>
      <p className="hint">{pay.price === null ? w.payPriceFirst : w.payPriceNote}</p>

      <h4>{w.register}</h4>
      <div className="field-row wrap">
        <label className="field-row">
          <span>{w.payMonth}</span>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
        <label className="field-row">
          <span>{w.lessonDay}</span>
          <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        </label>
        <button className="btn small primary" disabled={busy || pay.price === null} onClick={addLesson}>{w.addLesson}</button>
      </div>
      <p className="hint">{lessons.length ? w.registerHint : w.noLessons}</p>
      {!students.length ? <p className="muted">{t.teacher.noStudents}</p> : (
        <div className="heat-wrap">
          <table className="data-table pay-table">
            <thead>
              <tr>
                <th scope="col">{w.payStudent}</th>
                {lessons.map((l) => (
                  <th key={l.id} scope="col" className="pay-lesson">
                    {shortDay(l.day)}
                    <button className="pay-x" disabled={busy} aria-label={fill(w.removeLesson, { day: shortDay(l.day) })} title={fill(w.removeLesson, { day: shortDay(l.day) })} onClick={() => removeLesson(l.id)}>×</button>
                  </th>
                ))}
                <th scope="col">{w.payAttended}</th>
                <th scope="col">{w.payDue}</th>
                <th scope="col">{w.payPaid}</th>
                <th scope="col">{w.payOwed}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const row = summary.students[s.id];
                return (
                  <tr key={s.id}>
                    <th scope="row">{nameOf(s.id)}</th>
                    {lessons.map((l) => (
                      <td key={l.id} className="pay-tick">
                        <input type="checkbox" disabled={busy} checked={l.present.includes(s.id)} aria-label={`${nameOf(s.id)}, ${shortDay(l.day)}`}
                          onChange={(e) => tick(l.id, s.id, e.target.checked)} />
                      </td>
                    ))}
                    <td>{row.month.attended}</td>
                    <td>{m(row.month.due)}</td>
                    <td>{m(row.month.paid)}</td>
                    {owedCell(row.all)}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{w.payAll}</th>
                {lessons.map((l) => <td key={l.id} className="pay-tick">{l.present.filter((p) => ids.includes(p)).length}</td>)}
                <td>{summary.class.month.attended}</td>
                <td>{m(summary.class.month.due)}</td>
                <td>{m(summary.class.month.paid)}</td>
                {owedCell(summary.class.all)}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <dl className="pay-totals">
        <dt>{w.payMonthTotal}</dt>
        <dd>{fill(t.site.myPayLine, { n: summary.class.month.attended, due: m(summary.class.month.due), paid: m(summary.class.month.paid) })}</dd>
        <dt>{w.payAllTotal}</dt>
        <dd>{fill(t.site.myPayLine, { n: summary.class.all.attended, due: m(summary.class.all.due), paid: m(summary.class.all.paid) })}</dd>
      </dl>

      {!!students.length && (
        <>
          <h4>{w.recordPay}</h4>
          <div className="field-row wrap">
            <label className="field-row">
              <span>{w.payStudent}</span>
              <select value={who} onChange={(e) => setWho(e.target.value)}>
                <option value="" />
                {students.map((s) => <option key={s.id} value={s.id}>{nameOf(s.id)}</option>)}
              </select>
            </label>
            <label className="field-row">
              <span>{w.payAmount}</span>
              <input inputMode="decimal" value={amountText} style={{ width: 90 }} onChange={(e) => setAmountText(e.target.value)} />
            </label>
            <label className="field-row">
              <span>{w.lessonDay}</span>
              <input type="date" value={payDay} onChange={(e) => e.target.value && setPayDay(e.target.value)} />
            </label>
            <label className="field-row">
              <span>{w.payNote}</span>
              <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button className="btn small primary" disabled={busy || !who || !amountText.trim()} onClick={record}>{w.payRecord}</button>
          </div>
        </>
      )}
      {badAmount && <p className="error" role="alert">{w.payBadAmount}</p>}
      {failed && <p className="error" role="alert">{w.payFailed}</p>}

      <h4>{w.payList}</h4>
      {!paidInMonth.length ? <p className="muted">{w.payNone}</p> : (
        <ul className="pay-list">
          {paidInMonth.map((p) => (
            <li key={p.id}>
              <span>{shortDay(p.day)}</span> · <strong>{nameOf(p.student)}</strong> · {m(p.amount)}{p.note && <> · <em>{p.note}</em></>}
              <button className="btn small" disabled={busy} onClick={() => unpay(p.id)}>{w.payRemove}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
