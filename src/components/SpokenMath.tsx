// What a screen reader hears in place of a picture of maths: the words, then the maths as MathML. The picture
// itself is hidden from assistive technology (alt=""), and this text is hidden from the eye.
import { useMemo } from "react";
import { latexToMathML } from "../math/latex";

export function SpokenMath({ text, tex }: { text?: string; tex?: string }) {
  const mml = useMemo(() => {
    if (!tex) return "";
    try {
      return latexToMathML(tex);
    } catch {
      return "";
    }
  }, [tex]);
  // The MathML is MathJax's own serialisation of LaTeX the app wrote, never anything a user typed.
  return (
    <div className="sr-only">
      {text}
      {mml && <span dangerouslySetInnerHTML={{ __html: mml }} />}
    </div>
  );
}
