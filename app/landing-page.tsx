"use client";

import { FormEvent, PointerEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type LookupResult = {
  id: string;
  name: string;
  country: string | null;
  avatar: string | null;
  nameColor: { from: string | null; to: string | null } | null;
  profileUrl: string;
  archiveUrl: string | null;
};

type LookupPhase =
  | "idle"
  | "typing"
  | "loading"
  | "submitting"
  | "success"
  | "error";

async function lookupUser(
  username: string,
  signal: AbortSignal,
  prepareArchive = false,
) {
  const params = new URLSearchParams({ username });
  if (prepareArchive) params.set("prepare", "1");

  const response = await fetch(`/api/lookup?${params.toString()}`, {
    signal,
  });
  const payload = (await response.json()) as LookupResult & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "That username could not be found.");
  }

  return payload;
}

export default function LandingPage() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [phase, setPhase] = useState<LookupPhase>("idle");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pointerPositionRef = useRef({ x: 0, y: 0 });
  const cleanUsername = username.trim().replace(/^@/, "");
  const isLoading = phase === "loading" || phase === "submitting";

  useEffect(() => {
    if (cleanUsername.length < 2) return;

    const timeout = window.setTimeout(async () => {
      const controller = new AbortController();
      requestRef.current = controller;

      try {
        const payload = await lookupUser(cleanUsername, controller.signal);
        setResult(payload);
        setPhase("success");
        setMessage("Profile found. Select Find User to prepare the archive.");
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult(null);
        setPhase("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "The lookup failed. Check your connection and try again.",
        );
      } finally {
        if (requestRef.current === controller) requestRef.current = null;
      }
    }, 650);

    return () => {
      window.clearTimeout(timeout);
      requestRef.current?.abort();
    };
  }, [cleanUsername]);

  useEffect(
    () => () => {
      if (pointerFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerFrameRef.current);
      }
    },
    [],
  );

  function updateUsername(value: string) {
    const cleanValue = value.trim().replace(/^@/, "");
    requestRef.current?.abort();
    setUsername(value);
    setResult(null);
    setAvatarFailed(false);

    if (!cleanValue) {
      setPhase("idle");
      setMessage("");
    } else if (cleanValue.length < 2) {
      setPhase("typing");
      setMessage("Keep typing to look up the profile.");
    } else {
      setPhase("loading");
      setMessage(`Looking for @${cleanValue}...`);
    }
  }

  function trackPointer(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;

    pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    if (pointerFrameRef.current !== null) return;

    const landing = event.currentTarget;
    pointerFrameRef.current = window.requestAnimationFrame(() => {
      pointerFrameRef.current = null;
      if (!glowRef.current) return;

      const bounds = landing.getBoundingClientRect();
      const { x, y } = pointerPositionRef.current;
      glowRef.current.style.transform = `translate3d(${x - bounds.left}px, ${y - bounds.top}px, 0) translate(-50%, -50%)`;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cleanUsername) {
      setMessage("Enter a speedrun.com username first.");
      setResult(null);
      setPhase("error");
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setPhase("submitting");
    setMessage("");
    setAvatarFailed(false);

    try {
      const payload = await lookupUser(cleanUsername, controller.signal, true);
      setResult(payload);
      setPhase("success");
      setMessage("Profile found. Your archive is being prepared.");
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhase("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The lookup failed. Check your connection and try again.",
      );
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  return (
    <main className="landing" onPointerMove={trackPointer}>
      <div className="landing-atmosphere" aria-hidden="true">
        <span ref={glowRef} className="landing-glow" />
      </div>

      <header className="landing-header">
        <Link className="brand landing-brand" href="/" aria-label="Sum of Best home">
          <span className="brand-wordmark">SUM OF BEST</span>
        </Link>
      </header>

      <section className="landing-main">
        <div className="landing-copy">
          <span className="landing-kicker landing-reveal">FOR SPEEDRUNNERS</span>
          <h1 aria-label="A personal archive of your PBs">
            <span className="title-line title-line-one">A personal archive</span>
            <span className="title-line title-line-two">
              of your <em>PBs</em>
            </span>
          </h1>
          <p className="landing-lede landing-reveal">
            See how your PB changed over time. Explore current and obsolete runs
            in one chronological, playable history, with timelines for every game
            and category.
          </p>

          <form className="username-search landing-reveal" onSubmit={submit}>
            <label htmlFor="speedrun-username">SPEEDRUN.COM USERNAME</label>
            <div className="search-field">
              <span aria-hidden="true">@</span>
              <input
                id="speedrun-username"
                name="username"
                value={username}
                onChange={(event) => updateUsername(event.target.value)}
                placeholder="username"
                autoComplete="off"
                spellCheck="false"
              />
              <button type="submit" disabled={isLoading}>
                <span>{isLoading ? "LOOKING…" : "FIND USER"}</span>
                <i aria-hidden="true">→</i>
              </button>
            </div>
            <p className="search-message" aria-live="polite">
              {message || "Try any public speedrun.com username"}
            </p>
            {(result || cleanUsername) && (
              <div
                className={`lookup-result${result ? "" : " is-preview"}`}
                aria-busy={phase === "loading"}
              >
                {result?.avatar && !avatarFailed ? (
                  <img
                    src={result.avatar}
                    alt=""
                    width="54"
                    height="54"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : phase === "loading" ? (
                  <span className="lookup-avatar-loading" aria-hidden="true" />
                ) : !result ? (
                  <span className="lookup-initial" aria-hidden="true">
                    {cleanUsername.slice(0, 1).toUpperCase()}
                  </span>
                ) : (
                  <span className="lookup-initial" aria-hidden="true">
                    {result.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="lookup-identity">
                  <b>{result?.name ?? cleanUsername}</b>
                  <small>
                    {result?.country ??
                      (phase === "typing"
                        ? "Keep typing"
                        : phase === "error"
                          ? "No matching profile yet"
                          : "Searching speedrun.com")}
                  </small>
                </span>
                {result && (
                  <span className="lookup-actions">
                    {result.archiveUrl && (
                      <Link href={result.archiveUrl}>VIEW ARCHIVE</Link>
                    )}
                    <a
                      href={result.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                    SPEEDRUN.COM ↗
                    </a>
                  </span>
                )}
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
