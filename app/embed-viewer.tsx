"use client";

import { CSSProperties, useState } from "react";
import type { History, SiteData } from "./pb-history";

function displayDate(value: string) {
  if (value === "Unknown") return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function videoEmbed(url: string | null, autoplay: boolean) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    if (host === "youtu.be") {
      return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}?autoplay=${autoplay ? 1 : 0}&rel=0`;
    }
    if (host.includes("youtube.com")) {
      const id =
        parsed.searchParams.get("v") ??
        parsed.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
      return id
        ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&rel=0`
        : null;
    }
    if (host.includes("twitch.tv") && typeof window !== "undefined") {
      const parent = window.location.hostname;
      const vod = parsed.pathname.match(/\/videos\/(\d+)/)?.[1];
      if (vod) {
        return `https://player.twitch.tv/?video=v${vod}&parent=${parent}&autoplay=${autoplay}`;
      }
      const clip = host.startsWith("clips.")
        ? parsed.pathname.split("/").filter(Boolean)[0]
        : parsed.pathname.match(/\/clip\/([^/?]+)/)?.[1];
      if (clip) {
        return `https://clips.twitch.tv/embed?clip=${clip}&parent=${parent}&autoplay=${autoplay}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export default function EmbedViewer({
  profile,
  history,
}: {
  profile: SiteData["profile"];
  history: History;
}) {
  const [selected, setSelected] = useState(history.runs.length - 1);
  const [autoplay, setAutoplay] = useState(false);
  const run = history.runs[selected];
  const embed = videoEmbed(run.video, autoplay);
  const title = [history.categoryName, history.levelName, history.variant]
    .filter(Boolean)
    .join(" · ");
  const style = profile.nameColor?.from
    ? ({
        "--acid": profile.nameColor.from,
        "--acid-secondary": profile.nameColor.to ?? profile.nameColor.from,
        "--accent-gradient":
          profile.nameColor.to &&
          profile.nameColor.to !== profile.nameColor.from
            ? `linear-gradient(135deg, ${profile.nameColor.from}, ${profile.nameColor.to})`
            : profile.nameColor.from,
      } as CSSProperties)
    : undefined;

  return (
    <main className="embed-page" style={style}>
      <header className="embed-header">
        <div>
          <span className="embed-kicker">
            <span className="accent-name">@{profile.name}</span> / PB ARCHIVE
          </span>
          <h1>{history.gameName}</h1>
          <p>{title}</p>
        </div>
        <div className="embed-current">
          <span>CURRENT PB</span>
          <strong>{history.runs.at(-1)!.time}</strong>
        </div>
      </header>

      <div className="embed-layout">
        <section className="embed-video">
          <div className="video-frame">
            {embed ? (
              <iframe
                key={`${run.id}-${autoplay}`}
                src={embed}
                title={`${history.gameName} ${title} in ${run.time}`}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="video-fallback">
                <p>
                  {run.video
                    ? "This video cannot be embedded."
                    : "No video was attached to this run."}
                </p>
                <a href={run.video ?? run.runUrl} target="_blank" rel="noreferrer">
                  OPEN RUN ↗
                </a>
              </div>
            )}
          </div>
          <div className="embed-now-playing">
            <span>{displayDate(run.date)}</span>
            <strong>{run.time}</strong>
            <span>
              {run.platform}
              {run.emulated ? " · EMU" : ""}
            </span>
          </div>
        </section>

        <section className="embed-runs" aria-label="Personal best history">
          <div className="embed-runs-heading">
            <span>PB HISTORY</span>
            <span>{history.runs.length} RUNS</span>
          </div>
          <div className="embed-run-list">
            {history.runs
              .map((item, index) => ({ item, index }))
              .reverse()
              .map(({ item, index }) => (
                <button
                  type="button"
                  className={selected === index ? "active" : ""}
                  key={item.id}
                  onClick={() => {
                    setSelected(index);
                    setAutoplay(true);
                  }}
                  aria-pressed={selected === index}
                >
                  <span>{displayDate(item.date)}</span>
                  <strong>{item.time}</strong>
                  <small>{item.video ? "PLAY ↗" : "VIEW ↗"}</small>
                </button>
              ))}
          </div>
        </section>
      </div>

      <footer className="embed-footer">
        <a
          href={`/${encodeURIComponent(profile.name)}`}
          target="_blank"
          rel="noreferrer"
        >
          VIEW FULL ARCHIVE ↗
        </a>
        <span>PBARCHIVE.GG</span>
      </footer>
    </main>
  );
}
