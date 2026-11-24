// Signing in, making an account, and asking for a new-password link (#605): one form with three faces, on the account
// page and wherever else someone has to be signed in first. Each field says what is wrong with it before anything is
// sent; what the server refuses (a wrong password, an email already taken, too many tries) is said under the button.
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { account, looksLikeEmail, MIN_PASSWORD, useAccount, whoIsHere, type Account } from "../account";
import { ApiError } from "../api";
import { useI18n } from "../i18n";
import type { Site } from "../locales/site/en";
import { fill } from "../math/text";

type Words = Site["account"];
export type Face = "in" | "new" | "forgot";

/** What to say for a refused call: the server's reason by its status, or that it couldn't be reached. */
export function accountError(e: unknown, w: Words): string {
  if (!(e instanceof ApiError)) return w.offline;
  if (e.status === 401) return w.wrongLogin;
  if (e.status === 403) return w.wrongCurrent;
  if (e.status === 409) return w.emailTaken;
  if (e.status === 410) return w.linkDead;
  if (e.status === 429) return w.tooMany;
  if (e.status === 503) return w.noMail;
  return w.offline;
}

/** A labelled field with its hint and its complaint, tied to the input for screen readers. */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (ids: { id: string; describedBy?: string }) => ReactNode }) {
  const id = useId();
  const note = error || hint;
  return (
    <div className={`acct-field${error ? " bad" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, describedBy: note ? `${id}-note` : undefined })}
      {note && <small id={`${id}-note`} className={error ? "error" : "hint"} role={error ? "alert" : undefined}>{note}</small>}
    </div>
  );
}

/** A password box with a tick to show what is being typed (a child on a tablet can't see a slip otherwise). */
export function PasswordField({ label, value, onChange, fresh, error, hint }: {
  label: string; value: string; onChange: (v: string) => void; fresh?: boolean; error?: string; hint?: string;
}) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <>
          <input id={id} type={show ? "text" : "password"} autoComplete={fresh ? "new-password" : "current-password"} value={value} aria-describedby={describedBy}
            aria-invalid={!!error} autoCapitalize="none" spellCheck={false} onChange={(e) => onChange(e.target.value)} />
          <label className="check inline acct-show">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            {t.site.account.show}
          </label>
        </>
      )}
    </Field>
  );
}

export function AccountForm({ start = "in", onDone }: { start?: Face; onDone?: (a: Account) => void }) {
  const { t, lang } = useI18n();
  const w = t.site.account;
  const { mail } = useAccount();
  const [face, setFace] = useState<Face>(start);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  // A browser that already holds a student's code may be a shared one: whose it is has to be said, not guessed (#606).
  const [here] = useState(whoIsHere);
  const [mine, setMine] = useState<boolean | null>(null);
  const unsaid = face !== "forgot" && !!here && mine === null;

  const bad = {
    email: !looksLikeEmail(email) ? w.badEmail : "",
    name: face === "new" && !name.trim() ? w.badName : "",
    password: face === "new" && password.length < MIN_PASSWORD ? fill(w.shortPassword, { n: MIN_PASSWORD }) : "",
  };
  const show = (f: Face) => {
    setFace(f);
    setTried(false);
    setError("");
    setSent(false);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setError("");
    if (bad.email || bad.name || bad.password || (face === "in" && !password) || unsaid) return;
    setBusy(true);
    try {
      if (face === "forgot") {
        await account.askReset(email.trim(), lang);
        setSent(true);
      } else {
        // Signed in first, then told: an optional call skips its arguments when there is nobody to call.
        const me = face === "new" ? await account.signUp(email.trim(), name.trim(), password, lang, !!mine) : await account.signIn(email.trim(), password, !!mine);
        onDone?.(me);
      }
    } catch (err) {
      setError(accountError(err, w));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="acct-form" onSubmit={(e) => void submit(e)} noValidate>
      {face !== "forgot" && (
        <div className="acct-tabs" role="group" aria-label={w.title}>
          {(["in", "new"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={face === f} onClick={() => show(f)}>
              {f === "in" ? w.signIn : w.create}
            </button>
          ))}
        </div>
      )}
      {face === "forgot" && <p className="acct-note">{mail ? w.forgotLede : w.noMail}</p>}
      {face === "new" && (
        <Field label={w.name} hint={w.nameHint} error={tried ? bad.name : ""}>
          {({ id, describedBy }) => (
            <input id={id} autoComplete="name" maxLength={60} value={name} aria-describedby={describedBy} aria-invalid={tried && !!bad.name} onChange={(e) => setName(e.target.value)} />
          )}
        </Field>
      )}
      {(face !== "forgot" || mail) && (
        <Field label={w.email} error={tried ? bad.email : ""}>
          {({ id, describedBy }) => (
            <input id={id} type="email" inputMode="email" autoComplete={face === "new" ? "email" : "username"} autoCapitalize="none" spellCheck={false} value={email}
              aria-describedby={describedBy} aria-invalid={tried && !!bad.email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </Field>
      )}
      {face !== "forgot" && (
        <PasswordField label={w.password} value={password} onChange={setPassword} fresh={face === "new"}
          hint={face === "new" ? fill(w.passwordHint, { n: MIN_PASSWORD }) : undefined} error={tried ? bad.password : ""} />
      )}
      {face !== "forgot" && here && (
        <fieldset className={`acct-here${tried && unsaid ? " bad" : ""}`}>
          <legend>{fill(w.hereStudent, { code: here.code })}</legend>
          {([true, false] as const).map((v) => (
            <label key={String(v)} className="check inline">
              <input type="radio" name="acct-here" checked={mine === v} onChange={() => setMine(v)} />
              {v ? w.hereMine : w.hereOther}
            </label>
          ))}
          {tried && unsaid && <small className="error" role="alert">{w.hereChoose}</small>}
        </fieldset>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {sent && <p className="acct-ok" role="status">{w.linkSent}</p>}
      <div className="acct-go">
        {(face !== "forgot" || mail) && (
          <button className="z-btn z-btn-ink" type="submit" disabled={busy}>{face === "in" ? w.signIn : face === "new" ? w.create : w.sendLink}</button>
        )}
        {face === "in" && <button type="button" className="acct-link" onClick={() => show("forgot")}>{w.forgot}</button>}
        {face === "forgot" && <button type="button" className="acct-link" onClick={() => show("in")}>{w.back}</button>}
      </div>
    </form>
  );
}
