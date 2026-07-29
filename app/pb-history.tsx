"use client";

import { useMemo, useState } from "react";

type Run = {
  id: string;
  date: string;
  seconds: number;
  time: string;
  video: string | null;
  runUrl: string;
  platform: string | null;
  emulated: boolean;
  current: boolean;
};

type History = {
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

type SiteData = {
  generatedAt: string;
  source: string;
  profile: {
    name: string;
    country: string | null;
    avatar: string | null;
    profileUrl: string;
  };
  stats: {
    verifiedRuns: number;
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
}: {
  runs: Run[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const width = 700;
  const height = 210;
  const padX = 28;
  const padY = 26;
  const values = runs.map((run) => run.seconds);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const points = runs.map((run, index) => ({
    x:
      runs.length === 1
        ? width / 2
        : padX + (index / (runs.length - 1)) * (width - padX * 2),
    y: padY + ((run.seconds - min) / span) * (height - padY * 2),
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
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Personal best time progression"
      >
        <line x1="28" y1="26" x2="28" y2="184" className="axis" />
        <line x1="28" y1="184" x2="672" y2="184" className="axis" />
        <path d={path} className="chart-line" />
        {points.map((point, index) => (
          <circle
            key={runs[index].id}
            cx={point.x}
            cy={point.y}
            r={selected === index ? 8 : 5}
            className={selected === index ? "chart-dot active" : "chart-dot"}
            role="button"
            tabIndex={0}
            aria-label={`${longDate(runs[index].date)}, ${runs[index].time}`}
            onClick={() => onSelect(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(index);
            }}
          />
        ))}
      </svg>
      <div className="chart-range">
        <span>{longDate(runs[0].date)}</span>
        <span>{longDate(runs[runs.length - 1].date)}</span>
      </div>
    </div>
  );
}

function HistoryBlock({ history, index }: { history: History; index: number }) {
  const [selected, setSelected] = useState(history.runs.length - 1);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const run = history.runs[selected];
  const embed = embedUrl(run.video, shouldAutoplay);
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
        <span className="improvement">
          {history.runs.length > 1
            ? `−${Math.round(history.runs[0].seconds - history.runs.at(-1)!.seconds)}s`
            : "CURRENT PB"}
        </span>
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
          <ProgressChart runs={history.runs} selected={selected} onSelect={chooseRun} />
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
                    <span className="row-date">{longDate(item.date)}</span>
                    <strong>{item.time}</strong>
                    <span className="row-action">PLAY ↗</span>
                  </button>
                ))}
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}

export default function PBHistory({ data }: { data: SiteData }) {
  const games = useMemo(() => {
    const grouped = new Map<string, History[]>();
    for (const history of data.histories) {
      const existing = grouped.get(history.gameName) ?? [];
      existing.push(history);
      grouped.set(history.gameName, existing);
    }
    return [...grouped.entries()].map(([name, histories]) => ({
      name,
      id: toId(name),
      cover: histories[0].gameCover,
      histories,
    }));
  }, [data.histories]);

  const latest = Math.max(
    ...data.histories.flatMap((history) =>
      history.runs.map((run) => new Date(`${run.date}T00:00:00Z`).getTime()),
    ),
  );

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Volpey PB History home">
          <span className="brand-mark">V</span>
          <span>PB / ARCHIVE</span>
        </a>
        <nav aria-label="Primary">
          <a href="#games">THE RUNS</a>
          <a href={data.profile.profileUrl} target="_blank" rel="noreferrer">
            SPEEDRUN.COM ↗
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">VOLPEY’S SPEEDRUN TIMELINE</span>
          <h1>
            Every second
            <br />
            <em>earned.</em>
          </h1>
          <p>
            A complete, playable archive of personal bests—current records,
            obsolete runs, and every improvement in between.
          </p>
          <a className="primary-link" href="#games">
            EXPLORE THE ARCHIVE <span>↓</span>
          </a>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{data.stats.games}</strong>
            <span>GAMES</span>
          </div>
          <div>
            <strong>{data.stats.histories}</strong>
            <span>CATEGORIES</span>
          </div>
          <div>
            <strong>{data.stats.pbRuns}</strong>
            <span>PERSONAL BESTS</span>
          </div>
          <div className="profile-chip">
            {data.profile.avatar && (
              <img src={data.profile.avatar} alt="" width="54" height="54" />
            )}
            <span>
              <b>@{data.profile.name}</b>
              {data.profile.country}
            </span>
          </div>
        </div>
        <span className="hero-year">
          {new Date(latest).getUTCFullYear()}
        </span>
      </section>

      <section className="game-index" id="games">
        <div className="section-label">
          <span>01</span>
          <h2>GAME INDEX</h2>
          <span>{String(games.length).padStart(2, "0")} TITLES</span>
        </div>
        <div className="game-links">
          {games.map((game, index) => (
            <a href={`#${game.id}`} key={game.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {game.name}
              <b>{game.histories.length}</b>
            </a>
          ))}
        </div>
      </section>

      <div className="games">
        {games.map((game, gameIndex) => (
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
              {game.histories.map((history, index) => (
                <HistoryBlock history={history} index={index} key={history.id} />
              ))}
            </div>
          </section>
        ))}
      </div>

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
