import Link from "next/link";

export default function ArchiveLoading() {
  return (
    <main
      className="landing archive-loading"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="landing-atmosphere" aria-hidden="true">
        <span className="landing-glow" />
      </div>

      <header className="landing-header">
        <Link
          className="brand landing-brand"
          href="/"
          aria-label="Sum of Best home"
        >
          <span className="brand-wordmark">SUM OF BEST</span>
        </Link>
      </header>

      <section className="landing-main archive-loading-main" role="status">
        <div className="landing-copy archive-loading-copy">
          <span className="landing-kicker landing-reveal">
            ARCHIVE IN PROGRESS
          </span>
          <h1 aria-label="Building your personal archive">
            <span className="title-line title-line-one">Building your</span>
            <span className="title-line title-line-two">personal archive</span>
          </h1>
          <p className="landing-lede landing-reveal">
            We’re collecting your verified runs and piecing together every PB
            progression. A larger run history may take a little longer.
          </p>

          <div className="archive-build-panel landing-reveal" aria-hidden="true">
            <div className="archive-loading-meta">
              <span>FETCHING RUN HISTORY</span>
              <span>BUILDING / INDEXING / ARCHIVING</span>
            </div>
            <div className="archive-loading-progress">
              <span />
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer archive-loading-footer">
        <span>LIVE DATA FROM SPEEDRUN.COM</span>
        <span aria-hidden="true">PLEASE STAY ON THIS PAGE</span>
      </footer>
    </main>
  );
}
