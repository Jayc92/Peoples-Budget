import AppHeader from "./AppHeader";
import AppFooter from "./AppFooter";

export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <AppHeader />
      <main id="main-content" className="app-main" tabIndex={-1}>{children}</main>
      <AppFooter />
    </div>
  );
}
