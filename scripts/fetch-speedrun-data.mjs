import { mkdir, writeFile } from "node:fs/promises";

const API = "https://www.speedrun.com/api/v1";
const USERNAME = "Volpey";
const headers = {
  "User-Agent": "SumOfBest/0.1 (local data fetch; https://sumof.best)",
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

async function getAllLeaderboardRuns(gameId, categoryId, levelId) {
  const runs = [];
  let offset = 0;
  while (true) {
    const query = new URLSearchParams({
      game: gameId,
      category: categoryId,
      status: "verified",
      orderby: "date",
      direction: "asc",
      max: "200",
      offset: String(offset),
    });
    if (levelId) query.set("level", levelId);

    const payload = await get(`/runs?${query}`);
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

async function mapWithConcurrency(items, limit, callback) {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        await callback(item);
      }
    },
  );
  await Promise.all(workers);
}

async function markHistoricalWorldRecords(histories) {
  const groups = new Map();
  for (const history of histories) {
    const firstRun = history.runs[0];
    const key = [
      history.gameId,
      firstRun.categoryId,
      firstRun.levelId ?? "",
    ].join("|");
    const group = groups.get(key) ?? {
      gameId: history.gameId,
      categoryId: firstRun.categoryId,
      levelId: firstRun.levelId,
      histories: [],
    };
    group.histories.push(history);
    groups.set(key, group);
  }

  await mapWithConcurrency([...groups.values()], 4, async (group) => {
    try {
      const leaderboardRuns = await getAllLeaderboardRuns(
        group.gameId,
        group.categoryId,
        group.levelId,
      );
      for (const history of group.histories) {
        const firstRun = history.runs[0];
        const matchingRuns = leaderboardRuns.filter((candidate) =>
          firstRun.subcategoryVariableIds.every(
            (variableId) =>
              (candidate.values?.[variableId] ?? null) ===
              (firstRun.leaderboardValues[variableId] ?? null),
          ),
        );

        for (const run of history.runs) {
          if (run.date === "Unknown") {
            run.worldRecordAtTime = false;
            continue;
          }
          const fastestAtTime = matchingRuns.reduce((fastest, candidate) => {
            const candidateDate =
              candidate.date ?? candidate.submitted?.slice(0, 10);
            return candidateDate && candidateDate <= run.date
              ? Math.min(
                  fastest,
                  Number(candidate.times?.primary_t ?? Number.POSITIVE_INFINITY),
                )
              : fastest;
          }, Number.POSITIVE_INFINITY);
          run.worldRecordAtTime =
            Number.isFinite(fastestAtTime) &&
            Math.abs(run.seconds - fastestAtTime) < 0.0005;
        }
      }
    } catch {
      for (const history of group.histories) {
        for (const run of history.runs) run.worldRecordAtTime = false;
      }
    }
  });
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
  const leaderboardValues = {};
  const subcategoryVariableIds = variables
    .filter((variable) => variable["is-subcategory"])
    .map((variable) => variable.id);

  for (const [variableId, valueId] of Object.entries(run.values ?? {})) {
    const variable = variables.find((item) => item.id === variableId);
    const value = variable?.values?.values?.[valueId];
    if (variable?.["is-subcategory"]) {
      rulesetValues.push(`${variableId}:${valueId}`);
      leaderboardValues[variableId] = valueId;
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
    categoryId: run.category,
    levelId: run.level ?? null,
    leaderboardValues,
    subcategoryVariableIds,
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

await markHistoricalWorldRecords(histories);
for (const history of histories) {
  for (const run of history.runs) {
    delete run.categoryId;
    delete run.levelId;
    delete run.leaderboardValues;
    delete run.subcategoryVariableIds;
  }
}

const gamesSummary = [...new Set(histories.map((history) => history.gameId))];
const rawNameStyle = user["name-style"];
const nameColor = rawNameStyle
  ? {
      from:
        rawNameStyle["color-from"]?.dark ??
        rawNameStyle.color?.dark ??
        null,
      to:
        rawNameStyle["color-to"]?.dark ??
        rawNameStyle.color?.dark ??
        null,
    }
  : null;
const output = {
  generatedAt: new Date().toISOString(),
  source: user.weblink,
  profile: {
    id: user.id,
    name: user.names.international,
    country: user.location?.country?.names?.international ?? null,
    avatar: user.assets?.image?.uri ?? user.assets?.icon?.uri ?? null,
    nameColor,
    profileUrl: user.weblink,
  },
  stats: {
    verifiedRuns: runs.length,
    platforms: new Set(runs.map((run) => run.system?.platform).filter(Boolean))
      .size,
    totalRunSeconds: Math.round(
      runs.reduce((total, run) => total + run.times.primary_t, 0),
    ),
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
