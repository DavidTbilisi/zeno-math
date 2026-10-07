import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./i18n";
import { HomePage } from "./pages/HomePage";
import "./styles.css";

// Excalidraw + MathJax are heavy; load them only when a board is opened.
const BoardPage = lazy(() => import("./pages/BoardPage").then((m) => ({ default: m.BoardPage })));
const TeacherPage = lazy(() => import("./pages/TeacherPage").then((m) => ({ default: m.TeacherPage })));

function useHashRoute(): string {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    // A library coming back from libraries.excalidraw.com ("#addLibrary=…") is the open board's business: its
    // library handler takes it and puts the board's address back, so the route stays where it is.
    const onHash = () => !location.hash.includes("addLibrary=") && setHash(location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

function App() {
  const hash = useHashRoute();
  const boardId = hash.match(/^#\/b\/([\w-]+)/)?.[1];
  if (hash.startsWith("#/teacher"))
    return (
      <Suspense fallback={<div className="center-msg">…</div>}>
        <TeacherPage />
      </Suspense>
    );
  return boardId ? (
    <Suspense fallback={<div className="center-msg">…</div>}>
      <BoardPage key={boardId} id={boardId} />
    </Suspense>
  ) : (
    <HomePage />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
