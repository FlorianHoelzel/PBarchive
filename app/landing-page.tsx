"use client";

import { FormEvent, useState } from "react";

type LookupResult = {
  id: string;
  name: string;
  country: string | null;
  avatar: string | null;
  nameColor: { from: string | null; to: string | null } | null;
  profileUrl: string;
  archiveUrl: string | null;
};

export default function LandingPage() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanUsername = username.trim().replace(/^@/, "");

    if (!cleanUsername) {
      setMessage("Enter a speedrun.com username first.");
      setResult(null);
      return;
    }

    setIsLoading(true);
    setMessage("");
    setResult(null);
    setAvatarFailed(false);

    try {
      const response = await fetch(
        `/api/lookup?username=${encodeURIComponent(cleanUsername)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as LookupResult & {
        error?: string;
      };

      if (!response.ok) {
        setMessage(payload.error ?? "That username could not be found.");
        return;
      }

      setResult(payload);
      setMessage("Profile found. This result was fetched live from speedrun.com.");
    } catch {
      setMessage("The lookup failed. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="landing" id="top">
      <header className="site-header landing-header">
        <div className="brand">
          <a className="brand-mark" href="#top" aria-label="PB Archive home">
            PB
          </a>
          <span className="brand-breadcrumb">
            <a href="#top">PB ARCHIVE</a>
          </span>
        </div>
        <nav aria-label="Primary">
          <a href="#how-it-works">HOW IT WORKS</a>
          <a href="https://www.speedrun.com" target="_blank" rel="noreferrer">
            SPEEDRUN.COM ↗
          </a>
        </nav>
      </header>

      <section className="hero landing-hero">
        <div className="hero-intro">
          <span className="landing-kicker">YOUR SPEEDRUN HISTORY</span>
          <h1>
            <span className="accent-name">Your</span> PB Archive
          </h1>
          <p className="hero-lede">
            Every personal best tells part of the story. See the whole thing.
          </p>
          <p>
            Enter your speedrun.com username to turn your current and obsolete
            runs into a visual, playable history.
          </p>
          <a className="primary-link" href="#find-your-archive">
            FIND YOUR ARCHIVE <span>↓</span>
          </a>
        </div>

        <aside
          className="hero-note landing-lookup"
          id="find-your-archive"
          aria-label="Find your PB archive"
        >
          <span className="note-label">FIND YOUR ARCHIVE</span>
          <p>
            Start with your public <strong>speedrun.com username</strong>.
          </p>
          <form className="username-search" onSubmit={submit}>
            <label htmlFor="speedrun-username">USERNAME</label>
            <div className="search-field">
              <span aria-hidden="true">@</span>
              <input
                id="speedrun-username"
                name="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setMessage("");
                  setResult(null);
                  setAvatarFailed(false);
                }}
                placeholder="username"
                autoComplete="off"
                spellCheck="false"
              />
              <button type="submit" disabled={isLoading}>
                {isLoading ? "LOOKING…" : "FIND →"}
              </button>
            </div>
            <p className="search-message" aria-live="polite">
              {message || "Try any public speedrun.com username"}
            </p>
            {result && (
              <div className="lookup-result">
                {(result.name.toLowerCase() === "volpey" || result.avatar) &&
                !avatarFailed ? (
                  <img
                    src={
                      result.name.toLowerCase() === "volpey"
                        ? "/volpey-avatar.png"
                        : result.avatar!
                    }
                    alt=""
                    width="54"
                    height="54"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span className="lookup-initial" aria-hidden="true">
                    {result.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="lookup-identity">
                  <b>{result.name}</b>
                  <small>{result.country ?? "speedrun.com user"}</small>
                </span>
                <span className="lookup-actions">
                  {result.archiveUrl && (
                    <a href={result.archiveUrl}>VIEW ARCHIVE</a>
                  )}
                  <a href={result.profileUrl} target="_blank" rel="noreferrer">
                    SPEEDRUN.COM ↗
                  </a>
                </span>
              </div>
            )}
          </form>
        </aside>
      </section>

      <section className="archive-overview landing-overview" id="how-it-works">
        <div className="section-label">
          <span>00</span>
          <h2>WHAT’S IN AN ARCHIVE</h2>
          <b>BUILT FROM YOUR PUBLIC RUNS</b>
        </div>
        <div className="landing-feature-grid">
          <article className="overview-card landing-feature-card">
            <div className="overview-card-heading">
              <span>01 · PROGRESSION</span>
              <span>EVERY PB</span>
            </div>
            <div className="landing-feature-body">
              <strong>Watch the line move.</strong>
              <p>
                Follow each category from your first verified time to your
                current personal best.
              </p>
              <div className="landing-mini-chart" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </article>
          <article className="overview-card landing-feature-card">
            <div className="overview-card-heading">
              <span>02 · RUN FOOTAGE</span>
              <span>PLAYABLE</span>
            </div>
            <div className="landing-feature-body">
              <strong>Revisit the run.</strong>
              <p>
                Jump between PBs and watch attached videos without leaving the
                timeline.
              </p>
              <div className="landing-video-preview" aria-hidden="true">
                <span>▶</span>
              </div>
            </div>
          </article>
          <article className="overview-card landing-feature-card">
            <div className="overview-card-heading">
              <span>03 · THE BIG PICTURE</span>
              <span>AT A GLANCE</span>
            </div>
            <div className="landing-feature-body">
              <strong>See the years add up.</strong>
              <p>
                Explore your most active years, favorite games, platforms, and
                speedrunning milestones.
              </p>
              <div className="landing-stat-preview" aria-hidden="true">
                <span>
                  <b>PBs</b>
                  <strong>142</strong>
                </span>
                <span>
                  <b>GAMES</b>
                  <strong>12</strong>
                </span>
                <span>
                  <b>YEARS</b>
                  <strong>08</strong>
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <footer>
        <span>PB / ARCHIVE</span>
        <p>A SMALL PROJECT FOR PEOPLE WHO LIKE GOING FAST</p>
        <a href="https://www.speedrun.com" target="_blank" rel="noreferrer">
          DATA FROM SPEEDRUN.COM ↗
        </a>
      </footer>
    </main>
  );
}
