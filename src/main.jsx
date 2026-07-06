import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { configError } from "./lib/supabase.js";

// Design styles, imported exactly once at the app root, in cascade order.
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/pages.css";

// Inline styles are used for these failure surfaces on purpose: they must render
// even if a stylesheet failed to load. They never appear on the happy path.
const errStyle = {
  maxWidth: "34rem", margin: "12vh auto", padding: "2rem",
  fontFamily: "system-ui, sans-serif", lineHeight: 1.5, color: "#21443c",
};
const bannerStyle = {
  background: "#f6e3e0", color: "#a54539", borderBottom: "1px solid #e3b6ae",
  padding: "0.6rem 1rem", fontFamily: "system-ui, sans-serif", fontSize: "0.9rem", textAlign: "center",
};

// Top-level boundary: a render error anywhere shows a clear, recoverable message
// instead of a blank screen. Local progress lives in localStorage and is untouched.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("App render error:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={errStyle} role="alert">
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p>The page hit an unexpected error. Any budget you were building is saved on this
             device and is safe. Refreshing usually fixes it.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "1rem", padding: "0.6rem 1.2rem", cursor: "pointer" }}
          >Refresh</button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {configError && (
        <div style={bannerStyle} role="alert">
          The app can’t reach its backend right now. You can still build a budget on this
          device; submitting and public results are temporarily unavailable.
        </div>
      )}
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
