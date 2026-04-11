import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import DemoReaderPage from "../pages/demo/DemoReaderPage";
import ProtectedRoute from "../auth/ProtectedRoute";
import AppShell from "../layouts/AppShell";
import LoginPage from "../pages/auth/LoginPage";
import SignupPage from "../pages/auth/SignupPage";
import DashboardPage from "../pages/app/DashboardPage";
import LibraryPage from "../pages/app/LibraryPage";
import AccountPage from "../pages/app/AccountPage";

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
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    path: "/app",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "library", element: <LibraryPage /> },
          { path: "account", element: <AccountPage /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
