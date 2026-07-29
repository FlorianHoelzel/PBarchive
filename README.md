# PB Archive

PB Archive turns a [speedrun.com](https://www.speedrun.com) profile into an
interactive history of the runner's personal bests.

Enter a username to browse their games, categories, current records, and
obsolete runs in one place. Each category combines its progression graph, run
history, and available video footage.

## Features

- Live speedrun.com username lookup
- Current and obsolete PB history
- Game and category grouping
- Interactive progression graphs
- Selectable run footage
- Profile-specific accent colors and gradients
- Responsive archive navigator
- Category embed previews
- Twitch Panel Extension-sized preview

## Status

PB Archive is currently a personal prototype. The interface and data-grouping
rules are still being refined before public hosting.

## Development

PB Archive requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

Run the project checks:

```bash
npm test
```

## Project structure

- `app/` — routes, interface components, and styles
- `app/api/lookup/` — live speedrun.com profile lookup
- `app/speedrun-archive.ts` — archive construction and grouping
- `app/data/` — bundled prototype archive data
- `public/` — static assets

## Data

Run and profile data is sourced from the public speedrun.com API. PB Archive is
an independent project and is not affiliated with speedrun.com.
