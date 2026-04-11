import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import DemoReaderPage from "../pages/demo/DemoReaderPage";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/demo",
    element: <DemoReaderPage />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
