import ActiveSessionManager from "./components/auth/ActiveSessionManager";
import AppToaster from "./components/ui/AppToaster";
import { LanguageProvider } from "./context/LanguageContext";
import AppRoutes from "./routes";

export default function App() {
  return (
    <LanguageProvider>
      <ActiveSessionManager />
      <AppRoutes />
      <AppToaster />
    </LanguageProvider>
  );
}