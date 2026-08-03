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
    <main className="landing">
      <header className="landing-header">
        <a className="brand" href="/" aria-label="Sum of Best home">
          <span className="brand-mark">S/B</span>
          <span>SUM OF BEST</span>
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
                  setResult(null);
                  setAvatarFailed(false);
                }}
                placeholder="username"
                autoComplete="off"
                spellCheck="false"
              />
              <button type="submit" disabled={isLoading}>
                {isLoading ? "LOOKING…" : "FIND USER →"}
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
                  <a
                    href={result.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    SPEEDRUN.COM ↗
                  </a>
                </span>
              </div>
            )}
          </form>
        </div>

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
