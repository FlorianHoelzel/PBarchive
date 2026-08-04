"use client";

import { useMemo, useState } from "react";
import {
  archiveStyle,
  displayDate,
  historyAnchor,
  historyLabel,
} from "./archive-view";
import type { History, Run, SiteData } from "./pb-history";
import UserHeader from "./user-header";

type FeedItem = {
  history: History;
  run: Run;
  previous: Run | null;
};

function savedTime(current: Run, previous: Run | null) {
  if (!previous) return "FIRST PB";
  const difference = previous.seconds - current.seconds;
  if (difference < 60) {
    return `-${difference.toFixed(difference < 10 ? 2 : 1).replace(/\.0+$/, "")}s`;
  }
  const minutes = Math.floor(difference / 60);
  const seconds = Math.round(difference % 60);
  return `-${minutes}m ${seconds}s`;
}

function FeedRow({
  item,
  embedded,
  archivePath,
}: {
  item: FeedItem;
  embedded: boolean;
  archivePath: string;
}) {
  const label = historyLabel(item.history);

  return (
    <article className="feed-row">
      <div className="feed-row-date">
        <span>{displayDate(item.run.date)}</span>
        {item.run.current && <b>CURRENT</b>}
      </div>
      <div className="feed-cover" aria-hidden="true">
        {item.history.gameCover ? (
          <img src={item.history.gameCover} alt="" loading="lazy" />
        ) : (
          <span>{item.history.gameName.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div className="feed-row-copy">
        <h2>{item.history.gameName}</h2>
        <p>{label}</p>
        <span>
          {item.previous
            ? `${savedTime(item.run, item.previous)} IMPROVEMENT`
            : "FIRST PB"}
        </span>
      </div>
      <div className="feed-row-time">
        <strong>{item.run.time}</strong>
        <a
          href={item.run.video ?? item.run.runUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Watch ${item.history.gameName}, ${label}, in ${item.run.time}`}
        >
          WATCH ↗
        </a>
      </div>
      {!embedded && (
        <a
          className="feed-row-detail"
          href={`${archivePath}#${historyAnchor(item.history)}`}
          aria-label={`Open ${item.history.gameName} history`}
        >
          →
        </a>
      )}
    </article>
  );
}

export default function PBFeed({
  data,
  embedded = false,
}: {
  data: SiteData;
  embedded?: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "current">("all");
  const [game, setGame] = useState("all");
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState<"share" | "embed" | null>(null);

  const items = useMemo(
    () =>
      data.histories
        .flatMap((history) =>
          history.runs.map((run, index) => ({
            history,
            run,
            previous: index ? history.runs[index - 1] : null,
          })),
        )
        .sort((a, b) => {
          const dateOrder = b.run.date.localeCompare(a.run.date);
          return dateOrder || b.run.id.localeCompare(a.run.id);
        }),
    [data.histories],
  );
  const games = useMemo(
    () => [...new Set(data.histories.map((history) => history.gameName))].sort(),
    [data.histories],
  );
  const visibleItems = items.filter(
    (item) =>
      (filter === "all" || item.run.current) &&
      (game === "all" || item.history.gameName === game),
  );
  const archivePath = `/${encodeURIComponent(data.profile.name)}`;
  const feedPath = `${archivePath}/feed`;
  const embedPath = `${archivePath}/embed/feed`;

  async function copy(kind: "share" | "embed") {
    const origin = window.location.origin;
    const value =
      kind === "share"
        ? `${origin}${feedPath}`
        : `<iframe src="${origin}${embedPath}" width="318" height="496" title="${data.profile.name}'s PB feed" loading="lazy"></iframe>`;
    await navigator.clipboard.writeText(value);
    setCopied(kind);
  }

  if (embedded) {
    return (
      <main className="feed-embed" style={archiveStyle(data.profile)}>
        <header>
          <span>PB FEED / @{data.profile.name}</span>
          <b>{items.length} PBS</b>
        </header>
        <div className="feed-embed-list">
          {items.slice(0, 12).map((item) => (
            <FeedRow
              item={item}
              embedded
              archivePath={archivePath}
              key={`${item.history.id}-${item.run.id}`}
            />
          ))}
        </div>
        <footer>
          <span>RECENT PERSONAL BESTS</span>
          <a href={feedPath} target="_blank" rel="noreferrer">
            OPEN FEED ↗
          </a>
        </footer>
      </main>
    );
  }

  return (
    <main className="feed-page" id="top" style={archiveStyle(data.profile)}>
      <UserHeader profile={data.profile} page="PB FEED" />

      <section className="feed-hero">
        <span className="eyebrow">PB FEED / @{data.profile.name}</span>
        <div className="feed-hero-actions" aria-label="Feed actions">
          <button type="button" onClick={() => copy("share")}>
            {copied === "share" ? "LINK COPIED" : "SHARE"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCopied(null);
              setShowEmbed(true);
            }}
          >
            EMBED
          </button>
        </div>
      </section>

      <section className="feed-controls" aria-label="Filter personal best feed">
        <div className="feed-filter-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            type="button"
            onClick={() => setFilter("all")}
          >
            ALL PBS <span>{items.length}</span>
          </button>
          <button
            className={filter === "current" ? "active" : ""}
            type="button"
            onClick={() => setFilter("current")}
          >
            CURRENT <span>{data.histories.length}</span>
          </button>
        </div>
        <label>
          <span>GAME</span>
          <select value={game} onChange={(event) => setGame(event.target.value)}>
            <option value="all">All games</option>
            {games.map((name) => (
              <option value={name} key={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="feed-stream" aria-live="polite">
        <div className="feed-stream-heading">
          <span>{visibleItems.length} MILESTONES</span>
          <span>NEWEST FIRST</span>
        </div>
        {visibleItems.map((item) => (
          <FeedRow
            item={item}
            embedded={false}
            archivePath={archivePath}
            key={`${item.history.id}-${item.run.id}`}
          />
        ))}
      </section>

      <footer className="feed-footer">
        <span>SUM OF BEST / ARCHIVE</span>
        <p>Verified runs sourced from speedrun.com</p>
        <a href={archivePath}>EXPLORE THE ARCHIVE →</a>
      </footer>

      {showEmbed && (
        <div
          className="embed-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowEmbed(false);
          }}
        >
          <section
            className="embed-dialog feed-embed-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Embed PB feed"
          >
            <div className="embed-dialog-heading">
              <div>
                <span>SHARE THE FEED</span>
                <h4>@{data.profile.name} / latest PBs</h4>
              </div>
              <button type="button" onClick={() => setShowEmbed(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="feed-panel-preview">
              <iframe src={embedPath} title="Twitch-sized PB feed preview" />
            </div>
            <p>
              Sized at 318 × 496. Use the feed URL as an About panel link,
              paste the iframe into a website, or install the SumOfBest Twitch
              Extension for a live Twitch panel.
            </p>
            <div className="embed-dialog-actions">
              <button type="button" onClick={() => copy("embed")}>
                {copied === "embed" ? "COPIED" : "COPY WEBSITE IFRAME"}
              </button>
              <a href={embedPath} target="_blank" rel="noreferrer">
                OPEN PANEL ↗
              </a>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
