import { mkdir, writeFile } from "node:fs/promises";

const API = "https://www.speedrun.com/api/v1";
const USERNAME = "Volpey";
const headers = {
  "User-Agent": "Volpey PB History (local portfolio project)",
  Accept: "application/json",
};

async function get(path) {
  const response = await fetch(`${API}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${path}`);
  }
  return response.json();
}

async function getAllRuns(userId) {
  const runs = [];
  let offset = 0;
  while (true) {
    const payload = await get(
      `/runs?user=${userId}&status=verified&orderby=date&direction=asc&max=200&offset=${offset}`,
    );
    runs.push(...payload.data);
    const pagination = payload.pagination;
    if (!pagination?.links?.some((link) => link.rel === "next")) break;
    offset += pagination.max;
  }
  return runs;
}

async function mapById(ids, pathForId) {
  const unique = [...new Set(ids.filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (id) => {
      const payload = await get(pathForId(id));
      return [id, payload.data];
    }),
  );
  return Object.fromEntries(entries);
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  const base = hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
  return milliseconds ? `${base}.${String(milliseconds).padStart(3, "0")}` : base;
}

function videoFor(run) {
  return run.videos?.links?.[0]?.uri ?? null;
}

const userPayload = await get(`/users?lookup=${USERNAME}`);
const user = Array.isArray(userPayload.data) ? userPayload.data[0] : userPayload.data;
const runs = await getAllRuns(user.id);

const games = await mapById(runs.map((run) => run.game), (id) => `/games/${id}`);
const categories = await mapById(
  runs.map((run) => run.category),
  (id) => `/categories/${id}`,
);
const levels = await mapById(runs.map((run) => run.level), (id) => `/levels/${id}`);
const platforms = await mapById(
  runs.map((run) => run.system?.platform),
  (id) => `/platforms/${id}`,
);
const variablesByGame = await mapById(
  Object.keys(games),
  (id) => `/games/${id}/variables`,
);

const grouped = new Map();
for (const run of runs) {
  const game = games[run.game];
  const category = categories[run.category];
  const level = run.level ? levels[run.level] : null;
  const variables = variablesByGame[run.game] ?? [];
  const valueLabels = [];
  const runDetails = [];
  const rulesetValues = [];

  for (const [variableId, valueId] of Object.entries(run.values ?? {})) {
    const variable = variables.find((item) => item.id === variableId);
    const value = variable?.values?.values?.[valueId];
    if (variable?.["is-subcategory"]) {
      rulesetValues.push(`${variableId}:${valueId}`);
      if (value?.label) valueLabels.push(value.label);
    } else if (value?.label) {
      runDetails.push(value.label);
    }
  }

  const key = [
    run.game,
    run.category,
    run.level ?? "full-game",
    ...rulesetValues.sort(),
  ].join("|");

  if (!grouped.has(key)) {
    grouped.set(key, {
      id: key,
      gameId: run.game,
      gameName: game.names.international,
      gameAbbreviation: game.abbreviation,
      gameCover:
        game.assets?.["cover-large"]?.uri ??
        game.assets?.["cover-medium"]?.uri ??
        game.assets?.["cover-small"]?.uri ??
        null,
      categoryName: category.name,
      levelName: level?.name ?? null,
      variant: valueLabels.join(" · ") || null,
      runs: [],
    });
  }

  grouped.get(key).runs.push({
    id: run.id,
    date: run.date ?? run.submitted?.slice(0, 10) ?? "Unknown",
    submitted: run.submitted ?? null,
    seconds: run.times.primary_t,
    time: formatTime(run.times.primary_t),
    video: videoFor(run),
    runUrl: run.weblink,
    platform: platforms[run.system?.platform]?.name ?? null,
    emulated: Boolean(run.system?.emulated),
    detail: runDetails.join(" · ") || null,
  });
}

const histories = [];
for (const history of grouped.values()) {
  history.runs.sort((a, b) => {
    const dateOrder = a.date.localeCompare(b.date);
    return dateOrder || (a.submitted ?? "").localeCompare(b.submitted ?? "");
  });

  const seen = new Set();
  const uniqueRuns = history.runs.filter((run) => {
    const fingerprint = `${run.date}|${run.seconds}`;
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });

  let best = Number.POSITIVE_INFINITY;
  const progression = uniqueRuns.filter((run) => {
    if (run.seconds < best) {
      best = run.seconds;
      return true;
    }
    return false;
  });

  if (progression.length) {
    histories.push({
      ...history,
      runs: progression.map((run, index) => ({
        ...run,
        current: index === progression.length - 1,
      })),
    });
  }
}

histories.sort((a, b) => {
  const gameOrder = a.gameName.localeCompare(b.gameName);
  if (gameOrder) return gameOrder;
  const categoryOrder = a.categoryName.localeCompare(b.categoryName);
  if (categoryOrder) return categoryOrder;
  return (a.levelName ?? "").localeCompare(b.levelName ?? "");
});

const gamesSummary = [...new Set(histories.map((history) => history.gameId))];
const output = {
  generatedAt: new Date().toISOString(),
  source: user.weblink,
  profile: {
    id: user.id,
    name: user.names.international,
    country: user.location?.country?.names?.international ?? null,
    avatar: user.assets?.image?.uri ?? user.assets?.icon?.uri ?? null,
    profileUrl: user.weblink,
  },
  stats: {
    verifiedRuns: runs.length,
    pbRuns: histories.reduce((sum, history) => sum + history.runs.length, 0),
    games: gamesSummary.length,
    histories: histories.length,
  },
  histories,
};

await mkdir(new URL("../app/data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../app/data/speedruns.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  `Saved ${output.stats.pbRuns} PBs across ${output.stats.histories} histories and ${output.stats.games} games (${output.stats.verifiedRuns} verified runs scanned).`,
);
