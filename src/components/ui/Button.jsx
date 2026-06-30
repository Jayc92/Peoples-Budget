export default function Button({ variant = "primary", block = false, type = "button", children, ...rest }) {
  const cls = [
    "btn",
    variant === "primary" ? "btn--primary" : "btn--secondary",
    block ? "btn--block" : "",
  ].filter(Boolean).join(" ");
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
