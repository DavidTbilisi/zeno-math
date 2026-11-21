// A tool's dialog drawn into a page rather than over a board (#448): the library's entry page and a topic page's
// "Work through it here" both use it. It is the same dialog as on the board (as in the board's right-click panel), and
// the picture it makes shows below it.
import { Suspense, useState } from "react";
import { useI18n } from "../i18n";
import type { MenuEntry } from "../menus";
import { TOOLS, type ToolDialogProps } from "../tools";
import { PanelContext } from "./ItemPanel";

type Picture = Parameters<ToolDialogProps["onSubmit"]>[1];

export function ToolOnPage({ entry, name, onClose }: { entry: MenuEntry; name: string; onClose: () => void }) {
  const { t } = useI18n();
  const s = t.site;
  const [pic, setPic] = useState<Picture | null>(null);
  const ToolDialog = TOOLS[entry.kind]?.Dialog;
  if (!ToolDialog) return null;
  return (
    <>
      <p className="course-count">{s.toolHint}</p>
      <div className="site-tool">
        <PanelContext.Provider value={true}>
          <Suspense fallback={<p className="muted">{t.loading}</p>}>
            <ToolDialog start={entry.start} onSubmit={(_data, image) => setPic(image)} onClose={onClose} />
          </Suspense>
        </PanelContext.Provider>
      </div>
      {pic && (
        <figure className="site-pic">
          <figcaption>{s.madeHere}</figcaption>
          {pic.svg ? <div className="site-pic-svg" dangerouslySetInnerHTML={{ __html: pic.svg }} /> : pic.dataURL && <img src={pic.dataURL} alt={name} />}
        </figure>
      )}
    </>
  );
}
