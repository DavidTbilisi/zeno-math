// The practice page published on its own (GitHub Pages, vite.landing.config.ts), beside the front page: free practice
// in the browser, checked as it is answered, with no server behind it.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./i18n";
import { PracticePage } from "./pages/PracticePage";
import { startUsage } from "./usage";
import "./styles.css";

// Counted only when the build was told which Zeno server to report to (VITE_USAGE_URL, see usage.ts).
startUsage("practice page", import.meta.env.VITE_USAGE_URL as string | undefined);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <PracticePage standalone />
    </I18nProvider>
  </StrictMode>,
);
