// Whether this tab belongs to a teacher: the teacher's page keeps the password here, for this tab only, once the
// server has taken it (an empty one when the server asks for none). The games read it to open what a teacher may
// want to show a class before playing their way to it, such as the endless run. The board calls send it as whose boards
// they are about (api.ts boardOwner): in this tab, the teachers'.
export const TEACHER_KEY = "zeno.teacher";

export function isTeacher(): boolean {
  try {
    return sessionStorage.getItem(TEACHER_KEY) !== null;
  } catch {
    return false;
  }
}
