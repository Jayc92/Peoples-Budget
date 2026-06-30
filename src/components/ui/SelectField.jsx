import { useId } from "react";

export default function SelectField({ label, hint, value, onChange, options, ...rest }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <select id={id} className="select" value={value} onChange={onChange} {...rest}>
        {options.map((o) => {
          const val = Array.isArray(o) ? o[0] : o;
          const text = Array.isArray(o) ? o[1] : o;
          return <option key={val} value={val}>{text}</option>;
        })}
      </select>
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}
