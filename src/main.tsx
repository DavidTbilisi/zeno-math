import { lazy, StrictMode, Suspense, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./i18n";
import { SiteHome } from "./pages/SiteHome";
import "./styles.css";

// Excalidraw + MathJax are heavy; load them only when a board is opened.
const BoardPage = lazy(() => import("./pages/BoardPage").then((m) => ({ default: m.BoardPage })));
const TeacherPage = lazy(() => import("./pages/TeacherPage").then((m) => ({ default: m.TeacherPage })));
const SharedBoardPage = lazy(() => import("./pages/SharedBoardPage").then((m) => ({ default: m.SharedBoardPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const PracticePage = lazy(() => import("./pages/PracticePage").then((m) => ({ default: m.PracticePage })));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage").then((m) => ({ default: m.RoadmapPage })));
const BoardsPage = lazy(() => import("./pages/BoardsPage").then((m) => ({ default: m.BoardsPage })));
const SymbolsPage = lazy(() => import("./pages/SymbolsPage").then((m) => ({ default: m.SymbolsPage })));
const ExplainPage = lazy(() => import("./pages/ExplainPage").then((m) => ({ default: m.ExplainPage })));
const LearnPage = lazy(() => import("./pages/LearnPage").then((m) => ({ default: m.LearnPage })));
const LibraryPage = lazy(() => import("./pages/LibraryPage").then((m) => ({ default: m.LibraryPage })));
const ProgressPage = lazy(() => import("./pages/ProgressPage").then((m) => ({ default: m.ProgressPage })));
const CoursePage = lazy(() => import("./pages/CoursePage").then((m) => ({ default: m.CoursePage })));

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
  const shareToken = hash.match(/^#\/s\/([\w-]+)/)?.[1];
  if (shareToken)
    return (
      <Suspense fallback={<div className="center-msg">…</div>}>
        <SharedBoardPage key={shareToken} token={shareToken} />
      </Suspense>
    );
  const practice = hash.match(/^#\/practice(?:\/([\w.]+))?$/);
  if (practice)
    return (
      <Suspense fallback={<div className="center-msg">…</div>}>
        <PracticePage key={practice[1]} start={practice[1]} />
      </Suspense>
    );
  // A class's join link: the practice page, with the class code typed into its join box.
  const invite = hash.match(/^#\/join\/([A-Za-z0-9]+)$/)?.[1];
  if (invite)
    return (
      <Suspense fallback={<div className="center-msg">…</div>}>
        <PracticePage key={invite} invite={invite.toUpperCase()} />
      </Suspense>
    );
  const roadmap = hash.match(/^#\/roadmaps(?:\/([a-z]+))?$/);
  if (roadmap)
    return (
      <Suspense fallback={<div className="center-msg">…</div>}>
        <RoadmapPage key={roadmap[1] ?? ""} goal={roadmap[1]} />
      </Suspense>
    );
  // The site (#448): the boards, the topics, the library of tools and games, and the learner's progress.
  const site = (page: ReactNode) => <Suspense fallback={<div className="center-msg">…</div>}>{page}</Suspense>;
  if (hash === "#/boards") return site(<BoardsPage />);
  const learn = hash.match(/^#\/learn(?:\/([a-zA-Z]+))?$/);
  if (learn) return site(<LearnPage key={learn[1] ?? ""} topic={learn[1]} />);
  if (hash === "#/explain") return site(<ExplainPage />);
  const symbols = hash.match(/^#\/symbols(?:\/([a-zA-Z]+))?$/);
  if (symbols) return site(<SymbolsPage id={symbols[1]} />);
  const library = hash.match(/^#\/library(?:\/((?:live|tool)\/[\w-]+(?:\/[\w.-]+)?))?$/);
  if (library) return site(<LibraryPage key={library[1] ?? ""} path={library[1]} />);
  if (hash === "#/progress") return site(<ProgressPage />);
  if (hash === "#/course")
    return (
      <Suspense fallback={<div className="center-msg">…</div>}>
        <CoursePage />
      </Suspense>
    );
  // /about is the same front page at an address the server lets anyone open (#/about needs the password).
  if (hash === "#/about" || location.pathname === "/about")
    return (
      <Suspense fallback={<div className="center-msg">…</div>}>
        <AboutPage />
      </Suspense>
    );
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
    <SiteHome />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
