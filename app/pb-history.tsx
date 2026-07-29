"use client";

import { CSSProperties, useEffect, useId, useMemo, useState } from "react";

export type Run = {
  id: string;
  date: string;
  seconds: number;
  time: string;
  video: string | null;
  runUrl: string;
  platform: string | null;
  emulated: boolean;
  detail: string | null;
  current: boolean;
};

export type History = {
  id: string;
  gameId: string;
  gameName: string;
  gameAbbreviation: string;
  gameCover: string | null;
  categoryName: string;
  levelName: string | null;
  variant: string | null;
  runs: Run[];
};

export type SiteData = {
  generatedAt: string;
  source: string;
  profile: {
    name: string;
    country: string | null;
    avatar: string | null;
    nameColor?: { from: string | null; to: string | null } | null;
    profileUrl: string;
  };
  stats: {
    verifiedRuns: number;
    platforms: number;
    totalRunSeconds: number;
    pbRuns: number;
    games: number;
    histories: number;
  };
  histories: History[];
};

function toId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function longDate(value: string) {
  if (value === "Unknown") return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function embedUrl(url: string | null, autoplay: boolean) {
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

function ProgressChart({
  runs,
  selected,
  onSelect,
  gameName,
  categoryLabel,
}: {
  runs: Run[];
  selected: number;
  onSelect: (index: number) => void;
  gameName: string;
  categoryLabel: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = `chart-accent-${useId().replace(/:/g, "")}`;
  const gradientPaint = `url(#${gradientId})`;
  const width = 700;
  const height = 250;
  const padX = 28;
  const padY = 30;
  const values = runs.map((run) => run.seconds);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const points = runs.map((run, index) => ({
    x:
      runs.length === 1
        ? width / 2
        : padX + (index / (runs.length - 1)) * (width - padX * 2),
    y: padY + ((max - run.seconds) / span) * (height - padY * 2),
  }));
  const path = points
    .map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`)
    .join(" ");

  return (
    <div className="chart-wrap">
      <div className="chart-labels">
        <span>TIME</span>
        <span>{runs.length} PB{runs.length === 1 ? "" : "S"}</span>
      </div>
      <div className="chart-stage">
        <svg
          className="chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Personal best time progression"
        >
          <defs>
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1="28"
              y1="0"
              x2="672"
              y2="0"
            >
              <stop offset="0%" stopColor="var(--acid)" />
              <stop offset="100%" stopColor="var(--acid-secondary)" />
            </linearGradient>
          </defs>
          <line x1="28" y1="30" x2="28" y2="220" className="axis" />
          <line x1="28" y1="220" x2="672" y2="220" className="axis" />
          <path
            d={path}
            className="chart-line"
            style={{ stroke: gradientPaint }}
          />
          {points.map((point, index) => (
            <circle
              key={runs[index].id}
              cx={point.x}
              cy={point.y}
              r={selected === index ? 6 : 3.5}
              className={selected === index ? "chart-dot active" : "chart-dot"}
              style={{
                stroke: gradientPaint,
                fill:
                  selected === index || hovered === index
                    ? gradientPaint
                    : "var(--panel)",
              }}
              role="button"
              tabIndex={0}
              aria-label={`${longDate(runs[index].date)}, ${runs[index].time}`}
              onClick={() => onSelect(index)}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelect(index);
              }}
            />
          ))}
        </svg>
        {hovered !== null && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(points[hovered].x / width) * 100}%`,
              top: `${(points[hovered].y / height) * 100}%`,
            }}
          >
            <b>{gameName}</b>
            <span>{runs[hovered].detail ?? categoryLabel}</span>
            <strong>{runs[hovered].time}</strong>
            <small>{longDate(runs[hovered].date)}</small>
          </div>
        )}
      </div>
      <div className="chart-range">
        <span>{longDate(runs[0].date)}</span>
        <span>{longDate(runs[runs.length - 1].date)}</span>
      </div>
    </div>
  );
}

function HistoryBlock({
  history,
  index,
  username,
}: {
  history: History;
  index: number;
  username: string;
}) {
  const [selected, setSelected] = useState(history.runs.length - 1);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [embedPreviewMode, setEmbedPreviewMode] = useState<"widescreen" | "twitch">(
    "widescreen",
  );
  const run = history.runs[selected];
  const embed = embedUrl(run.video, shouldAutoplay);
  const embedPath = `/${encodeURIComponent(username)}/embed/${encodeURIComponent(history.id)}`;
  const embedSource =
    typeof window === "undefined"
      ? embedPath
      : `${window.location.origin}${embedPath}`;
  const embedCode = `<iframe src="${embedSource}" width="960" height="540" title="${history.gameName} PB history" loading="lazy"></iframe>`;
  const title = [history.categoryName, history.levelName, history.variant]
    .filter(Boolean)
    .join(" · ");

  function chooseRun(runIndex: number) {
    setSelected(runIndex);
    setShouldAutoplay(true);
  }

  return (
    <article
      className="history-card"
      style={{ "--delay": `${Math.min(index % 5, 4) * 70}ms` } as React.CSSProperties}
    >
      <div className="history-heading">
        <div>
          <span className="eyebrow">
            {history.levelName ? "INDIVIDUAL LEVEL" : "FULL GAME"}
          </span>
          <h3>{title}</h3>
        </div>
        <div className="history-actions">
          <button
            className="embed-trigger"
            type="button"
            onClick={() => {
              setCopied(false);
              setShowEmbed(true);
            }}
          >
            EMBED
          </button>
          <span className="improvement">
            {history.runs.length > 1
              ? `−${Math.round(history.runs[0].seconds - history.runs.at(-1)!.seconds)}s`
              : "CURRENT PB"}
          </span>
        </div>
      </div>

      <div className="history-layout">
        <section className="video-panel" aria-label={`Video for ${title}`}>
          <div className="video-topline">
            <span>RUN FOOTAGE</span>
            <span>{longDate(run.date)}</span>
          </div>
          <div className="video-frame">
            {embed ? (
              <iframe
                key={`${run.id}-${shouldAutoplay}`}
                src={embed}
                title={`${history.gameName} ${title} in ${run.time}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <div className="video-fallback">
                <span className="fallback-mark">V</span>
                <p>{run.video ? "This video can’t be embedded." : "No video was attached to this run."}</p>
                <a href={run.video ?? run.runUrl} target="_blank" rel="noreferrer">
                  {run.video ? "Open video" : "View run"}
                </a>
              </div>
            )}
          </div>
          <div className="now-playing">
            <span>NOW PLAYING</span>
            <strong>{run.time}</strong>
            <span>{run.platform}{run.emulated ? " · EMU" : ""}</span>
          </div>
        </section>

        <div className="history-data">
          <ProgressChart
            runs={history.runs}
            selected={selected}
            onSelect={chooseRun}
            gameName={history.gameName}
            categoryLabel={title}
          />
          <section className="runs-panel">
            <div className="table-heading">
              <span>PB HISTORY</span>
              <span>SELECT A RUN</span>
            </div>
            <div className="run-list">
              {history.runs
                .map((item, runIndex) => ({ item, runIndex }))
                .reverse()
                .map(({ item, runIndex }) => (
                  <button
                    className={runIndex === selected ? "run-row active" : "run-row"}
                    key={item.id}
                    type="button"
                    onClick={() => chooseRun(runIndex)}
                    aria-pressed={runIndex === selected}
                  >
                    <span className="row-dot" />
                    <span className="row-date">
                      <span>{longDate(item.date)}</span>
                      {item.detail && <small>{item.detail}</small>}
                    </span>
                    <strong>{item.time}</strong>
                    <span className="row-action">PLAY ↗</span>
                  </button>
                ))}
            </div>
          </section>
        </div>
      </div>
      {showEmbed && (
        <div
          className="embed-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowEmbed(false);
          }}
        >
          <section
            className="embed-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Embed ${history.gameName} ${title}`}
          >
            <div className="embed-dialog-heading">
              <div>
                <span>EMBED THIS CATEGORY</span>
                <h4>
                  {history.gameName} · {title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowEmbed(false)}
                aria-label="Close embed dialog"
              >
                ×
              </button>
            </div>
            <p>
              Paste this iframe into a website to show the interactive PB graph
              and history.
            </p>
            <div
              className={`embed-live-preview ${embedPreviewMode === "twitch" ? "twitch" : ""}`}
            >
              <div className="embed-live-preview-heading">
                <span>LIVE EMBED PREVIEW</span>
                <div className="embed-preview-switcher" aria-label="Preview size">
                  <button
                    type="button"
                    className={embedPreviewMode === "widescreen" ? "active" : ""}
                    onClick={() => setEmbedPreviewMode("widescreen")}
                  >
                    16:9
                  </button>
                  <button
                    type="button"
                    className={embedPreviewMode === "twitch" ? "active" : ""}
                    onClick={() => setEmbedPreviewMode("twitch")}
                  >
                    TWITCH · 318 × 496
                  </button>
                </div>
              </div>
              <iframe
                src={embedPath}
                title={`Preview of ${history.gameName} ${title} PB history`}
                loading="lazy"
              />
            </div>
            {embedPreviewMode === "twitch" && (
              <p className="embed-twitch-note">
                This previews a Twitch Panel Extension. Regular Twitch About
                panels support images and Markdown, not interactive iframes.
              </p>
            )}
            <textarea
              readOnly
              value={embedCode}
              aria-label="Embed code"
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="embed-dialog-actions">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(embedCode);
                  setCopied(true);
                }}
              >
                {copied ? "COPIED" : "COPY CODE"}
              </button>
              <a href={embedPath} target="_blank" rel="noreferrer">
                OPEN FULL SIZE ↗
              </a>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}

function LevelCollection({
  histories,
  username,
}: {
  histories: History[];
  username: string;
}) {
  const [activeId, setActiveId] = useState(histories[0].id);
  const active =
    histories.find((history) => history.id === activeId) ?? histories[0];

  return (
    <section className="level-collection">
      <div className="level-picker">
        <span>
          <b>INDIVIDUAL LEVELS</b>
          {histories.length} leaderboards grouped here
        </span>
        <label>
          <span>SELECT LEVEL</span>
          <select
            value={activeId}
            onChange={(event) => setActiveId(event.target.value)}
            aria-label="Select an individual level"
          >
            {histories.map((history) => (
              <option key={history.id} value={history.id}>
                {[history.levelName, history.variant].filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <HistoryBlock
        history={active}
        index={0}
        username={username}
        key={active.id}
      />
    </section>
  );
}

function ArchiveOverview({ histories }: { histories: History[] }) {
  const overview = useMemo(() => {
    const runs = histories
      .flatMap((history) =>
        history.runs.map((run) => ({
          ...run,
          gameName: history.gameName,
        })),
      )
      .filter((run) => run.date !== "Unknown");

    const years = new Map<number, number>();
    const games = new Map<string, number>();
    const platforms = new Map<string, number>();

    for (const run of runs) {
      const year = new Date(`${run.date}T00:00:00Z`).getUTCFullYear();
      years.set(year, (years.get(year) ?? 0) + 1);
      games.set(run.gameName, (games.get(run.gameName) ?? 0) + 1);
      if (run.platform) {
        platforms.set(run.platform, (platforms.get(run.platform) ?? 0) + 1);
      }
    }

    const observedYears = [...years.keys()];
    const firstYear = Math.min(...observedYears);
    const lastYear = Math.max(...observedYears);
    const yearEntries = Array.from(
      { length: lastYear - firstYear + 1 },
      (_, index) => {
        const year = firstYear + index;
        return [year, years.get(year) ?? 0] as [number, number];
      },
    );
    const gameEntries = [...games.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const platformEntries = [...platforms.entries()].sort((a, b) => b[1] - a[1]);
    const peakYear = [...yearEntries].sort((a, b) => b[1] - a[1])[0];
    const latest = [...runs].sort((a, b) => b.date.localeCompare(a.date))[0];

    return {
      years: yearEntries,
      games: gameEntries,
      platforms: platformEntries,
      peakYear,
      latest,
      maxYear: Math.max(...yearEntries.map((entry) => entry[1])),
      maxGame: gameEntries[0]?.[1] ?? 1,
      platformTotal: platformEntries.reduce((sum, entry) => sum + entry[1], 0),
    };
  }, [histories]);

  return (
    <section className="archive-overview" id="overview">
      <div className="section-label">
        <span>01</span>
        <h2>ARCHIVE OVERVIEW</h2>
        <span>
          {overview.years[0]?.[0]}—{overview.years.at(-1)?.[0]}
        </span>
      </div>

      <div className="overview-grid">
        <article className="overview-card activity-card">
          <div className="overview-card-heading">
            <span>PB ACTIVITY</span>
            <span>IMPROVEMENTS BY YEAR</span>
          </div>
          <div
            className="year-bars"
            aria-label="Personal bests by year"
            style={
              { "--year-count": overview.years.length } as React.CSSProperties
            }
          >
            {overview.years.map(([year, count]) => (
              <div className="year-column" key={year}>
                <strong>{count}</strong>
                <span
                  className="year-bar"
                  style={{ height: `${Math.max(8, (count / overview.maxYear) * 100)}%` }}
                  title={`${year}: ${count} personal bests`}
                />
                <small>{year}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="overview-card top-games-card">
          <div className="overview-card-heading">
            <span>TOP GAMES</span>
            <span>BY PB MILESTONES</span>
          </div>
          <div className="ranked-games">
            {overview.games.map(([name, count], index) => (
              <a href={`#${toId(name)}`} key={name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <b>{name}</b>
                  <i style={{ width: `${(count / overview.maxGame) * 100}%` }} />
                </div>
                <strong>{count}</strong>
              </a>
            ))}
          </div>
        </article>

        <article className="overview-card platforms-card">
          <div className="overview-card-heading">
            <span>PLATFORM MIX</span>
            <span>{overview.platforms.length} PLATFORMS</span>
          </div>
          <div className="platform-strip" aria-label="PB distribution by platform">
            {overview.platforms.map(([name, count], index) => (
              <span
                key={name}
                className={`platform-segment tone-${index % 5}`}
                style={{ width: `${(count / overview.platformTotal) * 100}%` }}
                title={`${name}: ${count} PBs`}
              />
            ))}
          </div>
          <div className="platform-legend">
            {overview.platforms.slice(0, 6).map(([name, count], index) => (
              <div key={name}>
                <span className={`legend-dot tone-${index % 5}`} />
                <b>{name}</b>
                <small>{count} PBs</small>
              </div>
            ))}
          </div>
        </article>

        <article className="overview-card peak-card">
          <div className="overview-card-heading">
            <span>PEAK ACTIVITY</span>
            <span>ARCHIVE PULSE</span>
          </div>
          <div className="peak-year">
            <strong>{overview.peakYear?.[0]}</strong>
            <span>{overview.peakYear?.[1]} personal bests</span>
          </div>
          {overview.latest && (
            <div className="latest-pb">
              <span>LATEST ENTRY</span>
              <b>{overview.latest.gameName}</b>
              <small>{longDate(overview.latest.date)}</small>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

export default function PBHistory({ data }: { data: SiteData }) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const update = () => setShowTop(window.scrollY > 500);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const games = useMemo(() => {
    const grouped = new Map<string, History[]>();
    for (const history of data.histories) {
      const existing = grouped.get(history.gameName) ?? [];
      existing.push(history);
      grouped.set(history.gameName, existing);
    }
    return [...grouped.entries()].map(([name, histories]) => {
      const groupedLevels =
        name === "Super Mario World 2: Yoshi's Island"
          ? histories.filter((history) => history.levelName)
          : [];
      return {
        name,
        id: toId(name),
        cover: histories[0].gameCover,
        histories,
        displayCount:
          histories.length - groupedLevels.length + (groupedLevels.length ? 1 : 0),
      };
    });
  }, [data.histories]);

  const datedRuns = data.histories
    .flatMap((history) => history.runs)
    .filter((run) => run.date !== "Unknown");
  const earliestYear = Math.min(
    ...datedRuns.map((run) => new Date(`${run.date}T00:00:00Z`).getUTCFullYear()),
  );
  const latestYear = Math.max(
    ...datedRuns.map((run) => new Date(`${run.date}T00:00:00Z`).getUTCFullYear()),
  );
  const yearsTracked = latestYear - earliestYear + 1;
  const totalHours = Math.floor(data.stats.totalRunSeconds / 3600);
  const totalMinutes = Math.floor((data.stats.totalRunSeconds % 3600) / 60);
  const profileAvatar =
    data.profile.name.toLowerCase() === "volpey"
      ? "/volpey-avatar.png"
      : data.profile.avatar;
  const archiveStyle = data.profile.nameColor?.from
    ? ({
        "--acid": data.profile.nameColor.from,
        "--acid-secondary":
          data.profile.nameColor.to ?? data.profile.nameColor.from,
        "--accent-gradient":
          data.profile.nameColor.to &&
          data.profile.nameColor.to !== data.profile.nameColor.from
            ? `linear-gradient(135deg, ${data.profile.nameColor.from}, ${data.profile.nameColor.to})`
            : data.profile.nameColor.from,
      } as CSSProperties)
    : undefined;
  const heroTitleMode =
    data.profile.name.length <= 10
      ? "short"
      : data.profile.name.length <= 18
        ? "medium"
        : "long";

  return (
    <main style={archiveStyle}>
      <header className="site-header">
        <a
          className="brand"
          href="#top"
          aria-label={`${data.profile.name} PB History home`}
        >
          {profileAvatar ? (
            <img
              className="brand-avatar"
              src={profileAvatar}
              alt=""
              width="34"
              height="34"
            />
          ) : (
            <span className="brand-avatar-fallback" aria-hidden="true">
              {data.profile.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span>
            <span className="accent-name">
              {data.profile.name.toUpperCase()}
            </span>{" "}
            / PB ARCHIVE
          </span>
        </a>
        <nav aria-label="Primary">
          <a href="#overview">OVERVIEW</a>
          <a href="#games">THE RUNS</a>
          <a href={data.profile.profileUrl} target="_blank" rel="noreferrer">
            SPEEDRUN.COM ↗
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-intro">
          <div className="hero-profile">
            {profileAvatar ? (
              <img src={profileAvatar} alt="" width="64" height="64" />
            ) : (
              <span className="hero-avatar-fallback" aria-hidden="true">
                {data.profile.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span>
              <b className="accent-name">@{data.profile.name}</b>
              <small>{data.profile.country} · speedrunning since {earliestYear}</small>
            </span>
          </div>

          <h1 className={`hero-title-${heroTitleMode}`}>
            <span className="accent-name">{data.profile.name}’s</span>{" "}
            {heroTitleMode === "long" && <br />}
            PB Archive
          </h1>
          <p className="hero-lede">
            A complete history of {data.profile.name}’s speedruns.
            Current records, obsolete PBs, and every improvement in between.
          </p>
          <p>
            Choose a game to explore the timeline and watch the available runs.
          </p>
          <a className="primary-link" href="#games">
            EXPLORE THE RUNS <span>↓</span>
          </a>
        </div>

        <aside className="hero-note" aria-label="A note about the archive">
          <span className="note-label">ARCHIVE AT A GLANCE</span>
          <p>
            <strong>{data.stats.games} games</strong>,{" "}
            <strong>{data.stats.histories} categories</strong>, and{" "}
            <strong>{data.stats.pbRuns} PBs</strong> collected over{" "}
            <strong>{yearsTracked} years</strong>.
          </p>
          <p>
            That adds up to {totalHours} hours and {totalMinutes} minutes of
            finished runs across {data.stats.platforms} platforms.
          </p>
        </aside>
      </section>

      <ArchiveOverview histories={data.histories} />

      <section className="game-index" id="games">
        <div className="section-label">
          <span>02</span>
          <h2>GAME INDEX</h2>
          <span>{String(games.length).padStart(2, "0")} TITLES</span>
        </div>
        <div className="game-links">
          {games.map((game, index) => (
            <a href={`#${game.id}`} key={game.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {game.name}
              <b>{game.displayCount}</b>
            </a>
          ))}
        </div>
      </section>

      <div className="games">
        {games.map((game, gameIndex) => {
          const groupedLevels =
            game.name === "Super Mario World 2: Yoshi's Island"
              ? game.histories.filter((history) => history.levelName)
              : [];
          const standaloneHistories = groupedLevels.length
            ? game.histories.filter((history) => !history.levelName)
            : game.histories;

          return (
            <section className="game-section" id={game.id} key={game.id}>
            <header className="game-heading">
              <span className="game-number">
                {String(gameIndex + 1).padStart(2, "0")}
              </span>
              <div>
                <span className="eyebrow">
                  {game.histories.length} CATEGOR
                  {game.histories.length === 1 ? "Y" : "IES"}
                </span>
                <h2>{game.name}</h2>
              </div>
              {game.cover && (
                <img src={game.cover} alt="" width="78" height="104" loading="lazy" />
              )}
            </header>
            <div className="game-histories">
              {standaloneHistories.map((history, index) => (
                <HistoryBlock
                  history={history}
                  index={index}
                  username={data.profile.name}
                  key={history.id}
                />
              ))}
              {groupedLevels.length > 0 && (
                <LevelCollection
                  histories={groupedLevels}
                  username={data.profile.name}
                />
              )}
            </div>
          </section>
          );
        })}
      </div>

      <button
        className={showTop ? "back-to-top visible" : "back-to-top"}
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑ <span>TOP</span>
      </button>

      <footer>
        <span>PB / ARCHIVE</span>
        <p>
          Data sourced from speedrun.com · Includes verified obsolete runs ·
          Updated {longDate(data.generatedAt.slice(0, 10))}
        </p>
        <a href="#top">BACK TO TOP ↑</a>
      </footer>
    </main>
  );
}
