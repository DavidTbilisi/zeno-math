// Predictions on topic pages (issue #578, src/model/predict.ts): a signed-in student's browser sends their first guess
// on each piece's "predict, then reveal", and the teacher sees the wrong ones beside the class's other answers. They
// move no mastery: nothing here reaches the learner model, the plan or the tests. Only the first guess on a piece is
// kept, as in the browser; sending it again changes nothing.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { CHANGES, isPredictKind, OUTCOMES, type Change, type PredictKind } from "../src/model/predictKinds.ts";
import { stmt } from "./db.ts";
import { HttpError, readJson, send } from "./http.ts";

export function initPredictions(db: DatabaseSync) {
  db.exec(`
    -- a student's first prediction on each piece's "predict, then reveal" (up, down or same), and whether it was right
    CREATE TABLE IF NOT EXISTS predictions (
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      pick TEXT NOT NULL,
      right INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (student_id, kind)
    );
  `);
}

/** POST /api/students/:code/predictions: { kind, pick }. Marked here, against the change itself, not as the browser said. */
export async function recordPrediction(req: IncomingMessage, res: ServerResponse, db: DatabaseSync, student: { id: number }) {
  const body = await readJson(req, 1024);
  if (typeof body.kind !== "string" || !isPredictKind(body.kind)) throw new HttpError(400, "unknown piece");
  if (!CHANGES.includes(body.pick as Change)) throw new HttpError(400, "pick must be up, down or same");
  const kind: PredictKind = body.kind;
  const pick = body.pick as Change;
  const right = pick === OUTCOMES[kind];
  stmt(db, "INSERT INTO predictions (student_id, kind, pick, right, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING")
    .run(student.id, kind, pick, right ? 1 : 0, Date.now());
  const kept = stmt(db, "SELECT pick, right FROM predictions WHERE student_id = ? AND kind = ?").get(student.id, kind) as { pick: Change; right: number };
  return send(res, 200, { pick: kept.pick, right: kept.right === 1 });
}

export type PredictionRow = { student: string; code: string; kind: PredictKind; pick: Change; outcome: Change };
/** For the teacher's dashboard: how many predictions the class made, and the wrong ones, newest first. */
export function predictionsOverview(db: DatabaseSync, classCode: string, students: readonly { id: number; code: string }[]) {
  const codes = new Map(students.map((s) => [s.id, s.code]));
  const rows = stmt(db, `
    SELECT p.student_id, p.kind, p.pick, p.right FROM predictions p JOIN students s ON s.id = p.student_id
    WHERE s.class_code = ? ORDER BY p.created_at DESC
  `).all(classCode) as { student_id: number; kind: string; pick: Change; right: number }[];
  const known = rows.filter((r) => codes.has(r.student_id) && isPredictKind(r.kind));
  const wrong: PredictionRow[] = known.filter((r) => !r.right).map((r) => {
    const kind = r.kind as PredictKind;
    return { student: `s${r.student_id}`, code: codes.get(r.student_id)!, kind, pick: r.pick, outcome: OUTCOMES[kind] };
  });
  return { made: known.length, wrong };
}
