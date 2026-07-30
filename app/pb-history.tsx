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
  worldRecordAtTime?: boolean;
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

function historyAnchor(history: History) {
  return `history-${toId(history.id)}`;
}

function historyLabel(history: History) {
  return [history.categoryName, history.levelName, history.variant]
    .filter(Boolean)
    .join(" · ");
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

function compactDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}

function embedUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    if (host === "youtu.be") {
      return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}?autoplay=0&rel=0`;
    }
    if (host.includes("youtube.com")) {
      const id =
        parsed.searchParams.get("v") ??
        parsed.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
      return id
        ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0`
        : null;
    }
    if (host.includes("twitch.tv") && typeof window !== "undefined") {
      const parent = window.location.hostname;
      const vod = parsed.pathname.match(/\/videos\/(\d+)/)?.[1];
      if (vod) {
        return `https://player.twitch.tv/?video=v${vod}&parent=${parent}&autoplay=false`;
      }
      const clip = host.startsWith("clips.")
        ? parsed.pathname.split("/").filter(Boolean)[0]
        : parsed.pathname.match(/\/clip\/([^/?]+)/)?.[1];
      if (clip) {
        return `https://clips.twitch.tv/embed?clip=${clip}&parent=${parent}&autoplay=false`;
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
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [embedPreviewMode, setEmbedPreviewMode] = useState<"widescreen" | "twitch">(
    "widescreen",
  );
  const run = history.runs[selected];
  const embed = embedUrl(run.video);
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
  }

  return (
    <article
      className="history-card"
      id={historyAnchor(history)}
      data-archive-id={historyAnchor(history)}
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
                key={run.id}
                src={embed}
                title={`${history.gameName} ${title} in ${run.time}`}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <div className="video-fallback">
                <span className="fallback-mark" aria-hidden="true">
                  <span className="fallback-play" />
                </span>
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

  useEffect(() => {
    function selectHashTarget() {
      const target = window.location.hash.slice(1);
      const selectedHistory = histories.find(
        (history) => historyAnchor(history) === target,
      );
      if (selectedHistory) setActiveId(selectedHistory.id);
    }

    selectHashTarget();
    window.addEventListener("hashchange", selectHashTarget);
    return () => window.removeEventListener("hashchange", selectHashTarget);
  }, [histories]);

  useEffect(() => {
    if (window.location.hash !== `#${historyAnchor(active)}`) return;
    requestAnimationFrame(() => {
      document
        .getElementById(historyAnchor(active))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [active]);

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

type ArchiveGame = {
  name: string;
  id: string;
  cover: string | null;
  histories: History[];
  displayCount: number;
};

type CoverPalette = {
  first: string;
  second: string;
  accent: string;
};

function extractCoverPalette(image: HTMLImageElement): CoverPalette | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Map<
      string,
      { red: number; green: number; blue: number; score: number }
    >();

    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 200) continue;
      const red = Math.round(pixels[index] / 32) * 32;
      const green = Math.round(pixels[index + 1] / 32) * 32;
      const blue = Math.round(pixels[index + 2] / 32) * 32;
      const maximum = Math.max(red, green, blue);
      const minimum = Math.min(red, green, blue);
      const saturation = maximum - minimum;
      const lightness = (maximum + minimum) / 2;
      if (lightness < 36 || lightness > 230 || saturation < 24) continue;

      const key = `${red}-${green}-${blue}`;
      const current = colors.get(key);
      const weight = 1 + saturation / 80;
      if (current) current.score += weight;
      else colors.set(key, { red, green, blue, score: weight });
    }

    const ranked = [...colors.values()].sort(
      (first, second) => second.score - first.score,
    );
    if (!ranked.length) return null;

    const primary = ranked[0];
    const distance = (
      first: (typeof ranked)[number],
      second: (typeof ranked)[number],
    ) =>
      Math.hypot(
        first.red - second.red,
        first.green - second.green,
        first.blue - second.blue,
      );
    const secondary =
      ranked.find((color) => distance(primary, color) > 105) ??
      ranked[1] ??
      primary;

    const paper = [244, 242, 237];
    const mix = (color: (typeof ranked)[number], strength: number) =>
      `rgb(${[color.red, color.green, color.blue]
        .map((channel, channelIndex) =>
          Math.round(
            channel * strength + paper[channelIndex] * (1 - strength),
          ),
        )
        .join(" ")})`;
    const solid = (color: (typeof ranked)[number]) =>
      `rgb(${color.red} ${color.green} ${color.blue})`;

    return {
      first: mix(primary, 0.58),
      second: mix(secondary, 0.5),
      accent: solid(primary),
    };
  } catch {
    return null;
  }
}

function GameHeading({
  game,
  index,
}: {
  game: ArchiveGame;
  index: number;
}) {
  const [palette, setPalette] = useState<CoverPalette | null>(null);
  useEffect(() => {
    if (!game.cover) return;
    let active = true;
    const paletteImage = new Image();
    paletteImage.onload = () => {
      const nextPalette = extractCoverPalette(paletteImage);
      if (active && nextPalette) setPalette(nextPalette);
    };
    paletteImage.src = `/api/cover?url=${encodeURIComponent(game.cover)}`;
    return () => {
      active = false;
    };
  }, [game.cover]);

  const style = palette
    ? ({
        "--game-color-first": palette.first,
        "--game-color-second": palette.second,
        "--game-cover-accent": palette.accent,
      } as CSSProperties)
    : undefined;

  return (
    <header
      className="game-heading"
      data-archive-id={game.id}
      style={style}
    >
      <span className="game-number">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div>
        <span className="eyebrow">
          {game.histories.length} CATEGOR
          {game.histories.length === 1 ? "Y" : "IES"}
        </span>
        <h2>{game.name}</h2>
      </div>
      {game.cover && (
        <img
          src={game.cover}
          alt=""
          width="78"
          height="104"
          loading="lazy"
        />
      )}
    </header>
  );
}

function ArchiveNavigator({ games }: { games: ArchiveGame[] }) {
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    let frame = 0;

    function updateActiveSection() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sections = Array.from(
          document.querySelectorAll<HTMLElement>("[data-archive-id]"),
        );
        let current = sections[0]?.dataset.archiveId ?? "overview";
        for (const section of sections) {
          if (section.getBoundingClientRect().top > 150) break;
          current = section.dataset.archiveId ?? current;
        }
        setActiveId(current);
      });
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("hashchange", updateActiveSection);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("hashchange", updateActiveSection);
    };
  }, []);

  const activeGame =
    games.find(
      (game) =>
        activeId === game.id ||
        game.histories.some((history) => historyAnchor(history) === activeId),
    )?.id ?? null;

  function jumpTo(id: string) {
    window.location.hash = id;
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <aside className="archive-navigator" aria-label="Archive navigator">
        <div className="archive-navigator-heading">
          <span>ARCHIVE NAVIGATOR</span>
          <b>{games.length} GAMES</b>
        </div>
        <nav>
          <a
            className={activeId === "overview" ? "active" : ""}
            href="#overview"
          >
            <span>00</span>
            OVERVIEW
          </a>
          <a className={activeId === "games" ? "active" : ""} href="#games">
            <span>→</span>
            GAME INDEX
          </a>
          {games.map((game, gameIndex) => (
            <div
              className={activeGame === game.id ? "navigator-game active" : "navigator-game"}
              key={game.id}
            >
              <a href={`#${game.id}`}>
                <span>{String(gameIndex + 1).padStart(2, "0")}</span>
                <b>{game.name}</b>
              </a>
              <div className="navigator-categories">
                {game.histories.map((history) => {
                  const anchor = historyAnchor(history);
                  return (
                    <a
                      className={activeId === anchor ? "active" : ""}
                      href={`#${anchor}`}
                      key={history.id}
                    >
                      {historyLabel(history)}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <label className="archive-navigator-mobile">
        <span>JUMP TO</span>
        <select
          aria-label="Jump to a game or category"
          value={activeId}
          onChange={(event) => jumpTo(event.target.value)}
        >
          <option value="overview">Archive overview</option>
          <option value="games">Game index</option>
          {games.map((game) => (
            <optgroup label={game.name} key={game.id}>
              <option value={game.id}>{game.name}</option>
              {game.histories.map((history) => (
                <option value={historyAnchor(history)} key={history.id}>
                  {historyLabel(history)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </>
  );
}

function ArchiveOverview({ histories }: { histories: History[] }) {
  const overview = useMemo(() => {
    const runs = histories
      .flatMap((history) =>
        history.runs.map((run) => ({
          ...run,
          gameName: history.gameName,
          categoryLabel: historyLabel(history),
        })),
      )
      .filter((run) => run.date !== "Unknown");

    const years = new Map<number, number>();
    const games = new Map<string, number>();
    const platforms = new Map<string, number>();
    const days = new Map<string, number>();
    const activeMonths = new Map<number, number>();

    for (const run of runs) {
      const date = new Date(`${run.date}T00:00:00Z`);
      const year = date.getUTCFullYear();
      years.set(year, (years.get(year) ?? 0) + 1);
      games.set(run.gameName, (games.get(run.gameName) ?? 0) + 1);
      days.set(run.date, (days.get(run.date) ?? 0) + 1);
      const monthKey = year * 12 + date.getUTCMonth();
      activeMonths.set(monthKey, (activeMonths.get(monthKey) ?? 0) + 1);
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
    const peakYearValue = peakYear?.[0];
    const peakRuns = peakYearValue
      ? runs.filter(
          (run) =>
            new Date(`${run.date}T00:00:00Z`).getUTCFullYear() ===
            peakYearValue,
        )
      : [];
    const peakMonths = Array.from({ length: 12 }, () => 0);
    const peakGames = new Map<string, number>();
    for (const run of peakRuns) {
      const month = new Date(`${run.date}T00:00:00Z`).getUTCMonth();
      peakMonths[month] += 1;
      peakGames.set(run.gameName, (peakGames.get(run.gameName) ?? 0) + 1);
    }
    const busiestMonthIndex = peakMonths.indexOf(Math.max(...peakMonths));
    const topPeakGame = [...peakGames.entries()].sort((a, b) => b[1] - a[1])[0];
    let peakBiggestSave = {
      seconds: 0,
      gameName: "",
      categoryLabel: "",
    };
    for (const history of histories) {
      for (let index = 1; index < history.runs.length; index += 1) {
        const run = history.runs[index];
        if (
          run.date === "Unknown" ||
          new Date(`${run.date}T00:00:00Z`).getUTCFullYear() !== peakYearValue
        ) {
          continue;
        }
        const saved = history.runs[index - 1].seconds - run.seconds;
        if (saved > peakBiggestSave.seconds) {
          peakBiggestSave = {
            seconds: saved,
            gameName: history.gameName,
            categoryLabel: historyLabel(history),
          };
        }
      }
    }
    const monthKeys = [...activeMonths.keys()].sort((a, b) => a - b);
    let currentStreak = monthKeys.length ? 1 : 0;
    let longestStreak = currentStreak;
    for (let index = 1; index < monthKeys.length; index += 1) {
      currentStreak =
        monthKeys[index] === monthKeys[index - 1] + 1 ? currentStreak + 1 : 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    }

    let totalSaved = 0;
    let biggestSave = {
      seconds: 0,
      gameName: "",
      categoryLabel: "",
    };
    for (const history of histories) {
      if (history.runs.length > 1) {
        totalSaved +=
          history.runs[0].seconds - history.runs.at(-1)!.seconds;
      }
      for (let index = 1; index < history.runs.length; index += 1) {
        const saved =
          history.runs[index - 1].seconds - history.runs[index].seconds;
        if (saved > biggestSave.seconds) {
          biggestSave = {
            seconds: saved,
            gameName: history.gameName,
            categoryLabel: historyLabel(history),
          };
        }
      }
    }

    const worldRecordsAtTime = runs.filter(
      (run) => run.worldRecordAtTime,
    ).length;
    const yearsActive =
      yearEntries.length > 0
        ? yearEntries.at(-1)![0] - yearEntries[0][0] + 1
        : 0;
    const milestoneName =
      runs.length >= 100
        ? "CENTURY CLUB"
        : runs.length >= 50
          ? "HALF CENTURY"
          : runs.length >= 25
            ? "QUARTER CENTURY"
            : "ON THE BOARD";
    const enduranceName =
      yearsActive >= 10
        ? "DECADE RUNNER"
        : yearsActive >= 5
          ? "LONG HAUL"
          : "MOMENTUM";
    const worldRecordName =
      worldRecordsAtTime >= 50
        ? "ALL-TIME GREAT"
        : worldRecordsAtTime >= 25
          ? "RECORD LEGEND"
          : worldRecordsAtTime >= 10
            ? "WORLD BEATER"
            : worldRecordsAtTime >= 5
              ? "RECORD BREAKER"
              : worldRecordsAtTime >= 1
                ? "RECORD SETTER"
                : "ON THE HUNT";

    return {
      years: yearEntries,
      games: gameEntries,
      platforms: platformEntries,
      peakYear,
      latest,
      maxYear: Math.max(...yearEntries.map((entry) => entry[1])),
      maxGame: gameEntries[0]?.[1] ?? 1,
      platformTotal: platformEntries.reduce((sum, entry) => sum + entry[1], 0),
      days,
      peakBreakdown: {
        months: peakMonths,
        maxMonth: Math.max(1, ...peakMonths),
        activeMonths: peakMonths.filter(Boolean).length,
        busiestMonth: new Intl.DateTimeFormat("en", {
          month: "long",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2020, Math.max(0, busiestMonthIndex), 1))),
        busiestMonthCount: Math.max(...peakMonths),
        topGame: topPeakGame?.[0] ?? "No game data",
        topGameCount: topPeakGame?.[1] ?? 0,
        biggestSave: peakBiggestSave,
      },
      achievements: [
        {
          name: milestoneName,
          value: String(runs.length),
          detail: "PB milestones archived",
        },
        {
          name: "TIME SHREDDER",
          value: compactDuration(totalSaved),
          detail: "Total time cut across every category",
        },
        {
          name: "GIANT LEAP",
          value: compactDuration(biggestSave.seconds),
          detail: biggestSave.gameName
            ? `${biggestSave.gameName} · ${biggestSave.categoryLabel}`
            : "Biggest single PB improvement",
        },
        {
          name: "HOT STREAK",
          value: `${longestStreak} mo`,
          detail: "Longest run of active PB months",
        },
        {
          name: enduranceName,
          value: `${yearsActive} yr`,
          detail: "Calendar years represented",
        },
        {
          name: worldRecordName,
          value: String(worldRecordsAtTime),
          detail: "World records when set",
        },
      ],
    };
  }, [histories]);
  const [heatmapYear, setHeatmapYear] = useState(
    overview.years.at(-1)?.[0] ?? new Date().getUTCFullYear(),
  );
  const heatmap = useMemo(() => {
    const first = new Date(Date.UTC(heatmapYear, 0, 1));
    const last = new Date(Date.UTC(heatmapYear, 11, 31));
    const cells: Array<
      | { blank: true }
      | { blank: false; date: string; count: number; level: number }
    > = Array.from({ length: first.getUTCDay() }, () => ({ blank: true }));
    const counts = [...overview.days.entries()]
      .filter(([date]) => date.startsWith(`${heatmapYear}-`))
      .map(([, count]) => count);
    const maximum = Math.max(1, ...counts);

    for (
      let date = new Date(first);
      date <= last;
      date.setUTCDate(date.getUTCDate() + 1)
    ) {
      const key = date.toISOString().slice(0, 10);
      const count = overview.days.get(key) ?? 0;
      cells.push({
        blank: false,
        date: key,
        count,
        level: count ? Math.max(1, Math.ceil((count / maximum) * 4)) : 0,
      });
    }

    return { cells, total: counts.reduce((sum, count) => sum + count, 0) };
  }, [heatmapYear, overview.days]);

  return (
    <section className="archive-overview" id="overview" data-archive-id="overview">
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

        <article className="overview-card heatmap-card">
          <div className="overview-card-heading">
            <span>ACTIVITY HEATMAP</span>
            <label>
              <span className="sr-only">Select calendar year</span>
              <select
                value={heatmapYear}
                onChange={(event) => setHeatmapYear(Number(event.target.value))}
              >
                {overview.years
                  .map(([year]) => year)
                  .reverse()
                  .map((year) => (
                    <option value={year} key={year}>
                      {year}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="heatmap-summary">
            <strong>{heatmap.total}</strong>
            <span>
              PB {heatmap.total === 1 ? "milestone" : "milestones"} in{" "}
              {heatmapYear}
            </span>
          </div>
          <div className="heatmap-scroll">
            <div className="heatmap-months" aria-hidden="true">
              {[
                "JAN",
                "FEB",
                "MAR",
                "APR",
                "MAY",
                "JUN",
                "JUL",
                "AUG",
                "SEP",
                "OCT",
                "NOV",
                "DEC",
              ].map((month) => (
                <span key={month}>{month}</span>
              ))}
            </div>
            <div
              className="heatmap-grid"
              role="img"
              aria-label={`${heatmap.total} personal best milestones during ${heatmapYear}`}
            >
              {heatmap.cells.map((cell, index) =>
                cell.blank ? (
                  <span className="heatmap-day blank" key={`blank-${index}`} />
                ) : (
                  <span
                    className={`heatmap-day level-${cell.level}`}
                    title={`${longDate(cell.date)}: ${cell.count} PB${
                      cell.count === 1 ? "" : "s"
                    }`}
                    key={cell.date}
                  />
                ),
              )}
            </div>
          </div>
          <div className="heatmap-legend" aria-hidden="true">
            <span>LESS</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <i className={`heatmap-day level-${level}`} key={level} />
            ))}
            <span>MORE</span>
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
      </div>

      <div className="overview-feature-grid">
        <article className="overview-card peak-card">
          <div className="overview-card-heading">
            <span>PEAK ACTIVITY</span>
            <span>ARCHIVE PULSE</span>
          </div>
          <div className="peak-body">
            <div className="peak-year">
              <strong>{overview.peakYear?.[0]}</strong>
              <span>{overview.peakYear?.[1]} personal bests</span>
            </div>
            <div className="peak-monthly">
              <div className="peak-monthly-heading">
                <span>MONTHLY RHYTHM</span>
                <span>{overview.peakBreakdown.activeMonths} ACTIVE MONTHS</span>
              </div>
              <div
                className="peak-month-bars"
                role="img"
                aria-label={`Personal bests by month during ${overview.peakYear?.[0]}`}
              >
                {overview.peakBreakdown.months.map((count, index) => (
                  <div
                    className="peak-month"
                    title={`${new Intl.DateTimeFormat("en", {
                      month: "long",
                      timeZone: "UTC",
                    }).format(new Date(Date.UTC(2020, index, 1)))}: ${count} PB${
                      count === 1 ? "" : "s"
                    }`}
                    key={index}
                  >
                    <strong>{count || ""}</strong>
                    <i
                      style={{
                        height: `${Math.max(
                          count ? 7 : 2,
                          (count / overview.peakBreakdown.maxMonth) * 100,
                        )}%`,
                      }}
                    />
                    <small>
                      {
                        [
                          "J",
                          "F",
                          "M",
                          "A",
                          "M",
                          "J",
                          "J",
                          "A",
                          "S",
                          "O",
                          "N",
                          "D",
                        ][index]
                      }
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="peak-facts">
            <div>
              <span>BUSIEST MONTH</span>
              <strong>{overview.peakBreakdown.busiestMonth}</strong>
              <small>
                {overview.peakBreakdown.busiestMonthCount} personal bests
              </small>
            </div>
            <div>
              <span>TOP GAME</span>
              <strong>{overview.peakBreakdown.topGame}</strong>
              <small>{overview.peakBreakdown.topGameCount} milestones</small>
            </div>
            <div>
              <span>BIGGEST LEAP</span>
              <strong>
                −{compactDuration(overview.peakBreakdown.biggestSave.seconds)}
              </strong>
              <small>
                {overview.peakBreakdown.biggestSave.gameName
                  ? `${overview.peakBreakdown.biggestSave.gameName} · ${overview.peakBreakdown.biggestSave.categoryLabel}`
                  : "No prior PB to compare"}
              </small>
            </div>
          </div>
        </article>

        <article className="overview-card achievements-card">
          <div className="overview-card-heading">
            <span>ACHIEVEMENTS</span>
            <span>{overview.achievements.length} UNLOCKED</span>
          </div>
          <div className="achievement-list">
            {overview.achievements.map((achievement, index) => (
              <div className="achievement" key={achievement.name}>
                <span className="achievement-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <span>{achievement.name}</span>
                  <strong>{achievement.value}</strong>
                  <small>{achievement.detail}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
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
      <ArchiveNavigator games={games} />
      <header className="site-header">
        <a
          className="brand"
          href="/"
          aria-label="PB Archive home"
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
            PB ARCHIVE /{" "}
            <span className="accent-name">
              {data.profile.name.toUpperCase()}
            </span>
          </span>
        </a>
        <nav aria-label="Primary">
          <a href="#overview">OVERVIEW</a>
          <a href="#games">THE RUNS</a>
          <a href={`/${encodeURIComponent(data.profile.name)}/feed`}>PB FEED</a>
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

      <section className="game-index" id="games" data-archive-id="games">
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
            <GameHeading game={game} index={gameIndex} />
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
