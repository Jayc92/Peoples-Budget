export default function MethodologyNote() {
  return (
    <section className="methodology" id="methodology" aria-label="Methodology and data sources">
      <h3 className="methodology__title">Methodology &amp; data sources</h3>
      <p className="methodology__text">
        Tax figures are estimates based on 2024 federal brackets, the standard
        deduction, payroll (FICA) tax, an estimated state rate, and an estimated
        local rate. They are for educational purposes and do not reflect your exact
        withholding, deductions, or credits.
      </p>
      <p className="methodology__text">
        Current government spending shares are approximate and point-in-time
        (FY2024): federal figures from OMB and CBO summaries, state figures from
        NASBO, and local figures from the U.S. Census Bureau. State and local
        shares are national averages.
      </p>
      <p className="methodology__text" id="sources">
        The People&rsquo;s Budget is nonpartisan and is not affiliated with any
        government agency, political party, or campaign. Public comparisons are
        aggregates and do not imply statistical significance.
      </p>
    </section>
  );
}
