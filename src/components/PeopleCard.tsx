// Teachers and roles (#687), an admin's page at #/teacher/people: every account with its role, which an admin changes
// with a select (not their own, and not one the server's ADMIN_EMAILS makes an admin; a student who asked to teach,
// #873, comes first with a one-click answer), and every class with its teacher,
// which an admin gives to a teacher or an admin (a class with nobody is seen by the admins only).
import { useEffect, useState } from "react";
import { ApiError, type People, type teacherApi } from "../api";
import type { Role } from "../account";
import type { Dict } from "../locales/en";

const ROLES: Role[] = ["student", "teacher", "admin"];

export function PeopleCard({ api, w, onChange }: { api: ReturnType<typeof teacherApi>; w: Dict["teacher"]["people"]; onChange: () => void }) {
  const [people, setPeople] = useState<People | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notAdmin" | "failed">("loading");

  const load = async () => {
    try {
      setPeople(await api.people());
      setState("ready");
    } catch (e) {
      setState(e instanceof ApiError && e.status === 403 ? "notAdmin" : "failed");
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);
  const change = async (act: () => Promise<unknown>) => {
    try {
      await act();
      await load();
      onChange();
    } catch {
      setState("failed");
    }
  };

  const back = <a className="site-back" href="#/teacher">← {w.back}</a>;
  if (state === "notAdmin") return <section className="people">{back}<p role="status">{w.notAdmin}</p></section>;
  if (state === "failed") return <section className="people">{back}<p className="error" role="alert">{w.failed}</p></section>;
  if (!people) return <section className="people">{back}<p className="muted">…</p></section>;
  // Who a class can go to: the accounts that teach.
  const staff = people.accounts.filter((a) => a.role !== "student");
  return (
    <section className="people">
      {back}
      <h2>{w.title}</h2>
      <p className="hint">{w.hint}</p>
      <h3>{w.accounts}</h3>
      <table className="people-table">
        <thead>
          <tr><th>{w.name}</th><th>{w.email}</th><th>{w.role}</th></tr>
        </thead>
        <tbody>
          {people.accounts.map((a) => (
            <tr key={a.id}>
              <td>{a.name}{a.id === people.me && <span className="muted"> ({w.you})</span>}</td>
              <td>{a.email}{!a.verified && <span className="muted small"> · {w.unconfirmed}</span>}</td>
              <td>
                {a.fixed ? (
                  <span>{w.roles.admin} <span className="muted small">· {w.fixed}</span></span>
                ) : (
                  <select aria-label={`${w.role}: ${a.email}`} value={a.role} disabled={a.id === people.me}
                    onChange={(e) => void change(() => api.setRole(a.id, e.target.value as Role))}>
                    {ROLES.map((r) => <option key={r} value={r}>{w.roles[r]}</option>)}
                  </select>
                )}
                {a.wantsTeach && (
                  <span className="people-asks">
                    {" "}<strong>{w.wantsTeach}</strong>{" "}
                    <button className="btn small primary" onClick={() => void change(() => api.setRole(a.id, "teacher"))}>{w.makeTeacher}</button>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>{w.classes}</h3>
      <table className="people-table">
        <thead>
          <tr><th>{w.className}</th><th>{w.owner}</th></tr>
        </thead>
        <tbody>
          {people.classes.map((c) => (
            <tr key={c.code}>
              <td>{c.name} <span className="mono small">{c.code}</span></td>
              <td>
                <select aria-label={`${w.owner}: ${c.name}`} value={c.owner ?? ""}
                  onChange={(e) => void change(() => api.setOwner(c.code, e.target.value === "" ? null : Number(e.target.value)))}>
                  <option value="">{w.nobody}</option>
                  {staff.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.email}</option>)}
                  {/* A class whose teacher has since become a student still names them. */}
                  {c.owner !== null && !staff.some((a) => a.id === c.owner) && <option value={c.owner}>{people.accounts.find((a) => a.id === c.owner)?.email ?? c.owner}</option>}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
