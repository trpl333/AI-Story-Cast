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
import DiscoverPage from "../pages/app/DiscoverPage";
import UploadBookPage from "../pages/app/UploadBookPage";
import AccountPage from "../pages/app/AccountPage";
import ReadChapterPage from "../pages/app/ReadChapterPage";
import BookDetailPage from "../pages/app/BookDetailPage";
import WebhookTestPage from "../pages/test/WebhookTestPage";

/** Developer harness only — not part of the product nav; omitted from production builds. */
const devOnlyRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: "/webhook-test", element: <WebhookTestPage /> }]
  : [];

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
  ...devOnlyRoutes,
  {
    path: "/app",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "library", element: <LibraryPage /> },
          { path: "discover", element: <DiscoverPage /> },
          { path: "upload", element: <UploadBookPage /> },
          { path: "books/:bookId", element: <BookDetailPage /> },
          { path: "read/:bookId/:chapterId", element: <ReadChapterPage /> },
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
