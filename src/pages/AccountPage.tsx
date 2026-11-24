// The account page (#605, #/account): signed out, the form to sign in or make an account; signed in, the account
// itself (the name, the email and whether it is confirmed, a new password, signing out, deleting it all). The two
// links the server mails lead here too: #/account/reset/<token> asks for a new password, #/account/verify/<token>
// confirms the address.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { account, MIN_PASSWORD, useAccount, type Account } from "../account";
import { AccountForm, accountError, Field, PasswordField } from "../components/AccountForm";
import { SiteBar, SiteFoot } from "../components/SiteBar";
import { useI18n } from "../i18n";
import { fill } from "../math/text";

export function AccountPage({ link }: { link?: { kind: "reset" | "verify"; token: string } }) {
  const { t } = useI18n();
  const w = t.site.account;
  const { account: me, known } = useAccount();
  return (
    <div className="z site">
      <SiteBar here="account" />
      <main className="z-page acct-page">
        <h1 className="z-page-title">{link?.kind === "reset" ? w.resetTitle : w.title}</h1>
        {link?.kind === "reset" ? (
          <NewPassword token={link.token} />
        ) : (
          <>
            {link?.kind === "verify" && <Confirm token={link.token} />}
            {me ? <Profile me={me} /> : known || !link ? <SignedOut /> : null}
          </>
        )}
      </main>
      <SiteFoot />
    </div>
  );
}

function SignedOut() {
  const { t } = useI18n();
  return (
    <>
      <p className="course-lede">{t.site.account.lede}</p>
      <section className="acct-card">
        <AccountForm />
      </section>
    </>
  );
}

/** The confirming link: used as the page opens, once (React's strict mode mounts twice in development). */
function Confirm({ token }: { token: string }) {
  const { t } = useI18n();
  const w = t.site.account;
  const { account: me } = useAccount();
  const [state, setState] = useState<"going" | "done" | string>("going");
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    account.confirm(token).then(() => setState("done"), (e) => setState(accountError(e, w)));
  }, [token, w]);
  // A link opened a second time is spent, but the address it confirmed still is.
  if (state === "done" || (state !== "going" && me?.verified)) return <p className="acct-ok acct-banner" role="status">✓ {w.verified}</p>;
  return state === "going" ? <p className="acct-note" role="status">{w.verifying}</p> : <p className="error acct-banner" role="alert">{state}</p>;
}

/** The new-password link: one box; setting it signs in, and the page becomes the account. */
function NewPassword({ token }: { token: string }) {
  const { t } = useI18n();
  const w = t.site.account;
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const short = password.length < MIN_PASSWORD;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setError("");
    if (short) return;
    setBusy(true);
    try {
      await account.setPassword(token, password);
      location.hash = "#/account";
    } catch (err) {
      setError(accountError(err, w));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="acct-card">
      <form className="acct-form" onSubmit={(e) => void submit(e)} noValidate>
        <PasswordField label={w.newPassword} value={password} onChange={setPassword} fresh hint={fill(w.passwordHint, { n: MIN_PASSWORD })}
          error={tried && short ? fill(w.shortPassword, { n: MIN_PASSWORD }) : ""} />
        {error && <p className="error" role="alert">{error}</p>}
        <div className="acct-go">
          <button className="z-btn z-btn-ink" type="submit" disabled={busy}>{w.save}</button>
          {error && <a className="acct-link" href="#/account">{w.back}</a>}
        </div>
      </form>
    </section>
  );
}

function Profile({ me }: { me: Account }) {
  const { t, lang } = useI18n();
  const w = t.site.account;
  const { mail } = useAccount();
  const [name, setName] = useState(me.name);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [gone, setGone] = useState("");
  /** What was last said, and about which part of the page. */
  const [said, setSaid] = useState<{ at: "name" | "mail" | "password" | "delete" | "out"; text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (at: NonNullable<typeof said>["at"], work: () => Promise<unknown>, ok = "") => {
    setBusy(true);
    setSaid(null);
    try {
      await work();
      if (ok) setSaid({ at, text: ok });
    } catch (e) {
      setSaid({ at, text: accountError(e, w), bad: true });
    } finally {
      setBusy(false);
    }
  };
  const note = (at: NonNullable<typeof said>["at"]) =>
    said?.at === at && <p className={said.bad ? "error" : "acct-ok"} role={said.bad ? "alert" : "status"}>{said.text}</p>;
  const shortNext = next.length < MIN_PASSWORD;

  return (
    <div className="acct-profile">
      <section className="acct-card acct-who" aria-labelledby="acct-who">
        <h2 id="acct-who">{fill(w.signedInAs, { name: me.name })}</h2>
        <p className="acct-email">{me.email}</p>
        {/* A server that sends no mail has mailed no link: nothing to confirm, and nothing to say about it. */}
        {me.verified ? (
          <p className="acct-ok">✓ {w.confirmed}</p>
        ) : mail ? (
          <div className="acct-unconfirmed">
            <p className="acct-note">{w.notConfirmed}</p>
            <button className="z-btn z-btn-line" disabled={busy} onClick={() => void run("mail", () => account.resend(lang), w.resent)}>{w.resend}</button>
          </div>
        ) : null}
        {note("mail")}
        <div className="acct-go">
          <button className="z-btn z-btn-line" disabled={busy} onClick={() => void run("out", () => account.signOut())}>{w.signOut}</button>
        </div>
        {note("out")}
      </section>

      <section className="acct-card">
        <form className="acct-form" noValidate onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void run("name", () => account.rename(name.trim()), w.saved);
        }}>
          <Field label={w.name} hint={w.nameHint} error={name.trim() ? "" : w.badName}>
            {({ id, describedBy }) => <input id={id} autoComplete="name" maxLength={60} value={name} aria-describedby={describedBy} onChange={(e) => setName(e.target.value)} />}
          </Field>
          {note("name")}
          <div className="acct-go">
            <button className="z-btn z-btn-ink" type="submit" disabled={busy || !name.trim() || name.trim() === me.name}>{w.save}</button>
          </div>
        </form>
      </section>

      <section className="acct-card" aria-labelledby="acct-password">
        <h2 id="acct-password">{w.changePassword}</h2>
        <form className="acct-form" noValidate onSubmit={(e) => {
          e.preventDefault();
          if (current && !shortNext)
            void run("password", async () => {
              await account.changePassword(current, next);
              setCurrent("");
              setNext("");
            }, w.passwordChanged);
        }}>
          <PasswordField label={w.currentPassword} value={current} onChange={setCurrent} />
          <PasswordField label={w.newPassword} value={next} onChange={setNext} fresh hint={fill(w.passwordHint, { n: MIN_PASSWORD })} />
          {note("password")}
          <div className="acct-go">
            <button className="z-btn z-btn-ink" type="submit" disabled={busy || !current || shortNext}>{w.save}</button>
          </div>
        </form>
      </section>

      <details className="acct-card acct-delete">
        <summary>{w.delete}</summary>
        <form className="acct-form" noValidate onSubmit={(e) => {
          e.preventDefault();
          if (gone) void run("delete", () => account.remove(gone));
        }}>
          <p className="acct-note">{w.deleteLede}</p>
          <PasswordField label={w.password} value={gone} onChange={setGone} />
          {note("delete")}
          <div className="acct-go">
            <button className="z-btn acct-danger" type="submit" disabled={busy || !gone}>{w.deleteGo}</button>
          </div>
        </form>
      </details>
    </div>
  );
}
