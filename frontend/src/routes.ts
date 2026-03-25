import { createBrowserRouter } from "react-router";
import Root from "./components/Root";
import Dashboard from "./components/pages/Dashboard";
import LiveCamera from "./components/pages/LiveCamera";
import ObjectDetection from "./components/pages/ObjectDetection";
import ObjectTracking from "./components/pages/ObjectTracking";
import VisionLanguage from "./components/pages/VisionLanguage";
import FewShotLearning from "./components/pages/FewShotLearning";
import ComparativeAnalysis from "./components/pages/ComparativeAnalysis";
import Performance from "./components/pages/Performance";
import History from "./components/pages/History";
import Settings from "./components/pages/Settings";
import About from "./components/pages/About";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "live-camera", Component: LiveCamera },
      { path: "object-detection", Component: ObjectDetection },
      { path: "object-tracking", Component: ObjectTracking },
      { path: "vision-language", Component: VisionLanguage },
      { path: "few-shot-learning", Component: FewShotLearning },
      { path: "comparative-analysis", Component: ComparativeAnalysis },
      { path: "performance", Component: Performance },
      { path: "history", Component: History },
      { path: "settings", Component: Settings },
      { path: "about", Component: About },
    ],
  },
]);
