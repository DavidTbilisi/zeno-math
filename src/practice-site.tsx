// The practice page published on its own (GitHub Pages, vite.landing.config.ts), beside the front page: free practice
// in the browser, checked as it is answered, with no server behind it.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./i18n";
import { PracticePage } from "./pages/PracticePage";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <PracticePage standalone />
    </I18nProvider>
  </StrictMode>,
);
