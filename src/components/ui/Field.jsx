import { useId } from "react";

export default function Field({ label, hint, localOnly = false, type = "text", value, onChange, ...rest }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {localOnly && (
          <span className="local-tag">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" />
            </svg>
            On this device
          </span>
        )}
      </label>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        onChange={onChange}
        {...rest}
      />
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}
