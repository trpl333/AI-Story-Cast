import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { MockAuthProvider } from "./auth/MockAuthProvider";

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        {/* Swap for SupabaseAuthProvider per docs/auth-supabase-migration.md */}
        <MockAuthProvider>
          <AppRoutes />
        </MockAuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
