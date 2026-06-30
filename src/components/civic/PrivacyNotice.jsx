export default function PrivacyNotice({ children }) {
  return (
    <p className="privacy" role="note">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
