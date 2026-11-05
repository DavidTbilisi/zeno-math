// A line of a game's code panel: highlighted like an editor (codeStyle), with the variables under their aliases, while
// the code view is on; plain text otherwise, so the games look as they did until the view is switched on.
import { highlight } from "../math/codeStyle";
import { useCodeNames, useCodeView } from "./codeView";

export function CodeLine({ text }: { text: string }) {
  const [on] = useCodeView();
  const { names } = useCodeNames();
  if (!on) return <>{text}</>;
  return (
    <>
      {highlight(text, names).map((t, i) => (
        <span key={i} style={{ color: t.color, fontWeight: t.bold ? 700 : undefined }}>{t.text}</span>
      ))}
    </>
  );
}
