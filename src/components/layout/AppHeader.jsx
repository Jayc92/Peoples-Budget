export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <p className="wordmark">
          <span className="wordmark__mark" aria-hidden="true">§</span>
          The People&rsquo;s Budget
        </p>
        <span className="app-header__desc">A public allocation experiment</span>
      </div>
    </header>
  );
}
