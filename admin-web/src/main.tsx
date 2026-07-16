import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App.tsx";
import { ProfileProvider } from "./context/ProfileContext";

createRoot(document.getElementById("root")!).render(
  <ProfileProvider>
    <App />
  </ProfileProvider>
);