"use client";

import { FormEvent, useState } from "react";

export default function LandingPage() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanUsername = username.trim().replace(/^@/, "");

    if (!cleanUsername) {
      setMessage("Enter a speedrun.com username first.");
      return;
    }

    if (cleanUsername.toLowerCase() === "volpey") {
      window.location.href = "/volpey";
      return;
    }

    setMessage(
      `${cleanUsername} isn’t loaded in this prototype yet. Try “Volpey” to see a complete archive.`,
    );
  }

  return (
    <main className="landing">
      <header className="landing-header">
        <a className="brand" href="/" aria-label="PB Archive home">
          <span className="brand-mark">PB</span>
          <span>PB ARCHIVE</span>
        </a>
        <a className="demo-link" href="/volpey">
          VIEW AN EXAMPLE
        </a>
      </header>

      <section className="landing-main">
        <div className="landing-copy">
          <span className="landing-kicker">FOR SPEEDRUNNERS</span>
          <h1>See how your PBs changed over time.</h1>
          <p>
            Enter your speedrun.com username to turn your current and obsolete
            runs into one playable history.
          </p>

          <form className="username-search" onSubmit={submit}>
            <label htmlFor="speedrun-username">SPEEDRUN.COM USERNAME</label>
            <div className="search-field">
              <span aria-hidden="true">@</span>
              <input
                id="speedrun-username"
                name="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setMessage("");
                }}
                placeholder="Volpey"
                autoComplete="off"
                spellCheck="false"
              />
              <button type="submit">FIND MY RUNS →</button>
            </div>
            <p className="search-message" aria-live="polite">
              {message || "Prototype tip: try Volpey"}
            </p>
          </form>
        </div>

        <aside className="landing-example">
          <span className="example-label">EXAMPLE ARCHIVE</span>
          <a href="/volpey" className="example-profile">
            <img
              className="example-avatar"
              src="/volpey-avatar.png"
              alt=""
              width="46"
              height="46"
            />
            <span>
              <b>Volpey’s PB Archive</b>
              <small>pbarchive.gg/volpey</small>
            </span>
            <i>↗</i>
          </a>
          <p>
            Games, categories, improvement graphs, old runs, and their videos—
            all collected from one public profile.
          </p>
          <div className="example-history" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </aside>
      </section>

      <footer className="landing-footer">
        <span>A SMALL PROJECT FOR PEOPLE WHO LIKE GOING FAST</span>
        <a href="https://www.speedrun.com" target="_blank" rel="noreferrer">
          DATA FROM SPEEDRUN.COM ↗
        </a>
      </footer>
    </main>
  );
}
