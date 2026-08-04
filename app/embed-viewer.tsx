"use client";

import { CSSProperties, useId, useState } from "react";
import { displayDate } from "./archive-view";
import type { History, Run, SiteData } from "./pb-history";

function EmbedChart({
  runs,
  selected,
  onSelect,
}: {
  runs: Run[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const gradientId = `embed-gradient-${useId().replace(/:/g, "")}`;
  const gradientPaint = `url(#${gradientId})`;
  const width = 620;
  const height = 250;
  const padX = 24;
  const padY = 24;
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
    <div className="embed-chart-stage">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Personal best progression graph"
      >
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={padX}
            y1="0"
            x2={width - padX}
            y2="0"
          >
            <stop offset="0%" stopColor="var(--acid)" />
            <stop offset="100%" stopColor="var(--acid-secondary)" />
          </linearGradient>
        </defs>
        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          className="axis"
        />
        <path d={path} className="chart-line" style={{ stroke: gradientPaint }} />
        {points.map((point, index) => (
          <circle
            key={runs[index].id}
            cx={point.x}
            cy={point.y}
            r={selected === index ? 6 : 3.5}
            className="chart-dot"
            style={{
              stroke: gradientPaint,
              fill: selected === index ? gradientPaint : "var(--panel)",
            }}
            role="button"
            tabIndex={0}
            aria-label={`${displayDate(runs[index].date)}, ${runs[index].time}`}
            onClick={() => onSelect(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(index);
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export default function EmbedViewer({
  profile,
  history,
}: {
  profile: SiteData["profile"];
  history: History;
}) {
  const [selected, setSelected] = useState(history.runs.length - 1);
  const run = history.runs[selected];
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
            <span className="accent-name">@{profile.name}</span> / SUM OF BEST
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
        <section className="embed-chart-panel">
          <div className="embed-runs-heading">
            <span>PB PROGRESSION</span>
            <span>{history.runs.length} PB{history.runs.length === 1 ? "" : "S"}</span>
          </div>
          <EmbedChart
            runs={history.runs}
            selected={selected}
            onSelect={setSelected}
          />
          <div className="embed-chart-range">
            <span>{displayDate(history.runs[0].date)}</span>
            <span>{displayDate(history.runs.at(-1)!.date)}</span>
          </div>
          <div className="embed-selected-run">
            <span>{displayDate(run.date)}</span>
            <strong>{run.time}</strong>
            <a href={run.runUrl} target="_blank" rel="noreferrer">
              VIEW RUN ↗
            </a>
          </div>
        </section>

        <section className="embed-runs" aria-label="Personal best history">
          <div className="embed-runs-heading">
            <span>PB HISTORY</span>
            <span>SELECT A RUN</span>
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
                  onClick={() => setSelected(index)}
                  aria-pressed={selected === index}
                >
                  <span>{displayDate(item.date)}</span>
                  <strong>{item.time}</strong>
                  <small>SELECT</small>
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
        <span>SUMOF.BEST</span>
      </footer>
    </main>
  );
}
