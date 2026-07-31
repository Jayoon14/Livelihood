import { createRoot } from "react-dom/client";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ProfileProvider } from "./context/ProfileContext";
import { LoadingProvider } from "./context/LoadingContext";
import { ThemeProvider } from "./context/ThemeContext";

import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <ThemeProvider>
    <LoadingProvider>
      <AuthProvider>
        <ProfileProvider>
          <App />
        </ProfileProvider>
      </AuthProvider>
    </LoadingProvider>
  </ThemeProvider>,
);