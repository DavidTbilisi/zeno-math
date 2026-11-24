// What runs on a topic's page published on its own (topic-prerender.tsx wrote the page): the styles, and the hands-on
// piece under "Try it", in the page's language (data-lang on <html>, langs.ts). The list of topics has no piece.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./i18n";
import { InlinePiece } from "./live/InlinePiece";
import type { LiveKind } from "./math/live";
import { startUsage } from "./usage";
import "./styles.css";

// Counted only when the build was told which Zeno server to report to (VITE_USAGE_URL, see usage.ts).
startUsage("topic page", import.meta.env.VITE_USAGE_URL as string | undefined);

const place = document.getElementById("topic-piece");
if (place?.dataset.kind)
  createRoot(place).render(
    <StrictMode>
      <I18nProvider>
        <InlinePiece kind={place.dataset.kind as LiveKind} />
      </I18nProvider>
    </StrictMode>,
  );
