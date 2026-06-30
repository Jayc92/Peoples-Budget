import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Design styles, imported exactly once at the app root, in cascade order.
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/pages.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
