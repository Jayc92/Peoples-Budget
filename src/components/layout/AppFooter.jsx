// Footer meta items render as plain informational text until destination
// pages/callbacks exist. Pass `links={[{label, onClick}]}` to make them actionable.
export default function AppFooter({ links }) {
  const items = links && links.length
    ? links
    : [{ label: "Privacy" }, { label: "Methodology" }, { label: "Data sources" }];
  return (
    <footer className="app-footer">
      <div className="container app-footer__inner">
        <ul className="app-footer__links" aria-label="About this project">
          {items.map((it) => (
            <li key={it.label}>
              {it.onClick ? (
                <button type="button" className="app-footer__link-btn" onClick={it.onClick}>
                  {it.label}
                </button>
              ) : (
                <span className="app-footer__link-text">{it.label}</span>
              )}
            </li>
          ))}
        </ul>
        <p className="app-footer__fine">
          Tax figures are estimates for educational and civic-engagement purposes
          and do not reflect exact withholding, deductions, or credits. Government
          spending shares are approximate and point-in-time (FY2024).
        </p>
        <p className="app-footer__fine">
          The People&rsquo;s Budget is nonpartisan and is not affiliated with any
          government agency, political party, or campaign.
        </p>
      </div>
    </footer>
  );
}
