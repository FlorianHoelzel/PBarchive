# Sum of Best

Sum of Best turns a public [speedrun.com](https://www.speedrun.com) profile into
a visual, interactive history of the runner's personal bests. It collects
verified runs, reconstructs each category's PB progression, and preserves the
obsolete runs that show how the runner improved over time.

## Features

### Live profile archives

- Look up any public speedrun.com username from the landing page
- Include verified full-game and individual-level runs
- Keep categories, levels, and leaderboard variants organized
- Show only the runs that advanced a personal best
- Display profile details, country, avatar, and speedrun.com name colors
- Summarize games, categories, PB milestones, platforms, years tracked, verified
  runs, and total finished-run time

### Archive overview

- PB activity chart covering every represented year
- Ranked list of the runner's most-played games by PB milestones
- Year-selectable activity heatmap with daily PB counts
- Clickable heatmap days that open their runs and jump to the selected history
- Platform distribution chart and legend
- Peak-year breakdown with monthly activity, busiest month, top game, and
  biggest improvement
- Generated achievement tiers for milestone count, total time saved, biggest
  single improvement, longest active-month streak, years active, and historical
  world records

### Game and category histories

- Game index and sticky archive navigator with deep links to each section
- Game covers with automatically derived accent palettes
- Full-game categories and grouped individual-level leaderboards
- Interactive PB progression graphs with selectable data points
- Reverse-chronological run history with dates, exact times, category details,
  platforms, and emulator labels
- Embedded YouTube and Twitch run footage when available
- Direct links to non-embeddable videos or the original run page
- Recognition for PBs that were world records when they were set

### Shareable views

- A chronological **PB Feed** of every improvement
- Feed filters for all PBs or current PBs, plus filtering by game
- Improvement amounts and direct run/video links in the feed
- A page-turning **Speedrun Passport** with one game stamp per title
- Passport stats for PB count, categories, historic world records, platforms,
  active years, and each game's standout run
- Copyable share links for feed and passport pages

### Embeds

- Interactive category-history embeds with a graph and selectable run list
- Compact PB Feed embeds designed for a 318 x 496 panel
- Full Speedrun Passport embeds
- Live embed previews and copyable iframe code
- 16:9 and Twitch-panel preview modes for category embeds

## Data and attribution

Run and profile information comes from
[speedrun.com](https://www.speedrun.com). Sum of Best is an independent project
and is not affiliated with speedrun.com.

Visit [sumof.best](https://sumof.best).

## Twitch panel extension

The `twitch-extension` directory contains a native Twitch Panel Extension. It
does not embed the website in another iframe. Twitch hosts the built static
assets, and the panel fetches public PB data from `/api/feed`.

Configure the Twitch version with these values:

- Type: `Panel`
- Testing Base URI: `https://localhost:8080/`
- Panel Viewer Path: `panel.html`
- Configuration Path: `config.html`
- Panel Height: `496`
- Configuration: `Extension Configuration Service`
- Broadcaster Writable Channel Segment Version: `1`
- Allowlisted Panel URLs: `https://sumof.best`
- Allowlisted Image Domains: `https://www.speedrun.com`
- Allowlisted URL Fetching Domains: `https://sumof.best`

For local testing, run the website and extension server in separate terminals:

```powershell
npm.cmd run dev -- --port 3000
npm.cmd run twitch:dev
```

Open `https://localhost:8080/panel.html?username=volpey` once and accept the
development certificate warning. Twitch can then load `panel.html` and
`config.html` from the configured Local Test base URI. During local testing,
the extension server proxies `/api/feed` to the website on port 3000.

Build and package the reviewed static assets with:

```powershell
npm.cmd run twitch:package
```

The uploadable ZIP is written to
`outputs/sumofbest-twitch-extension-1.0.0.zip`. Deploy the main website before
Hosted Test so the packaged extension can reach `https://sumof.best/api/feed`.

## Deploying with Coolify

Create an **Application** in Coolify from this GitHub repository and select
**Dockerfile** as the build pack. Use these settings:

- Dockerfile location: `/Dockerfile`
- Exposed port: `3000`
- Domain: `https://sumof.best`
- Health check path: `/`
- Persistent storage mount: `/data`

The container trusts Coolify's reverse-proxy headers, listens on every network
interface, and uses Coolify's `PORT` value when one is provided. No application
secrets are required.

Generated user archives are stored under `/data/archive-cache`. Configure `/data`
as persistent storage in Coolify so cached archives survive deployments. Archives
are fresh for one day, retained for six months, and refreshed in the background
when an older cached archive is requested. These defaults can be changed with
`ARCHIVE_CACHE_FRESH_DAYS` and `ARCHIVE_CACHE_RETENTION_DAYS`.

Point the domain's `A` record at the Coolify server's public IPv4 address (and
its `AAAA` record at the public IPv6 address only when IPv6 is configured on
the server). Add `www` as a CNAME to `sumof.best` if the `www` hostname should
also resolve, then add `https://www.sumof.best` to the application's domains.
