import type { History, SiteData } from "./pb-history";

const API = "https://www.speedrun.com/api/v1";
const requestHeaders = {
  Accept: "application/json",
  "User-Agent": "SumOfBest/0.1 (live archive preview; https://sumof.best)",
};

type ApiRecord = Record<string, any>;

async function request(path: string, allowNotFound = false) {
  const response = await fetch(`${API}${path}`, {
    cache: "no-store",
    headers: requestHeaders,
  });

  if (allowNotFound && response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`speedrun.com returned ${response.status} for ${path}`);
  }

  return response.json() as Promise<ApiRecord>;
}

async function get(path: string) {
  return (await request(path))!;
}

async function getOptional(path: string) {
  return request(path, true);
}

async function getAllRuns(userId: string) {
  const runs: ApiRecord[] = [];
  let offset = 0;

  while (true) {
    const payload = await get(
      `/runs?user=${userId}&status=verified&orderby=date&direction=asc&max=200&offset=${offset}`,
    );
    runs.push(...(payload.data ?? []));
    const pagination = payload.pagination;

    if (!pagination?.links?.some((link: ApiRecord) => link.rel === "next")) {
      break;
    }

    offset += pagination.max;
  }

  return runs;
}

async function getAllLeaderboardRuns(
  gameId: string,
  categoryId: string,
  levelId: string | null,
) {
  const runs: ApiRecord[] = [];
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
    runs.push(...(payload.data ?? []));
    const pagination = payload.pagination;
    if (!pagination?.links?.some((link: ApiRecord) => link.rel === "next")) {
      break;
    }
    offset += pagination.max;
  }

  return runs;
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  callback: (item: T) => Promise<void>,
) {
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

type InternalRun = History["runs"][number] & {
  categoryId?: string;
  levelId?: string | null;
  leaderboardValues?: Record<string, string>;
  subcategoryVariableIds?: string[];
};

async function markHistoricalWorldRecords(histories: History[]) {
  const groups = new Map<
    string,
    {
      gameId: string;
      categoryId: string;
      levelId: string | null;
      histories: History[];
    }
  >();
  for (const history of histories) {
    const firstRun = history.runs[0] as InternalRun | undefined;
    if (!firstRun?.categoryId) continue;
    const key = [
      history.gameId,
      firstRun.categoryId,
      firstRun.levelId ?? "",
    ].join("|");
    const group = groups.get(key) ?? {
      gameId: history.gameId,
      categoryId: firstRun.categoryId,
      levelId: firstRun.levelId ?? null,
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
        const firstRun = history.runs[0] as InternalRun;
        const variableIds = firstRun.subcategoryVariableIds ?? [];
        const expectedValues = firstRun.leaderboardValues ?? {};
        const matchingRuns = leaderboardRuns.filter((candidate) =>
          variableIds.every(
            (variableId) =>
              (candidate.values?.[variableId] ?? null) ===
              (expectedValues[variableId] ?? null),
          ),
        );

        for (const run of history.runs as InternalRun[]) {
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

async function mapById(
  ids: Array<string | null | undefined>,
  pathForId: (id: string) => string,
) {
  const unique = [...new Set(ids.filter(Boolean))] as string[];
  const entries = (
    await Promise.all(
      unique.map(async (id) => {
        const payload = await getOptional(pathForId(id));
        return payload?.data ? ([id, payload.data] as const) : null;
      }),
    )
  ).filter((entry): entry is readonly [string, ApiRecord] => entry !== null);
  return Object.fromEntries(entries) as Record<string, ApiRecord>;
}

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round(
    (totalSeconds - Math.floor(totalSeconds)) * 1000,
  );
  const base = hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
  return milliseconds
    ? `${base}.${String(milliseconds).padStart(3, "0")}`
    : base;
}

export async function buildUserArchive(username: string): Promise<SiteData | null> {
  const userPayload = await get(
    `/users?lookup=${encodeURIComponent(username)}`,
  );
  const user = Array.isArray(userPayload.data)
    ? userPayload.data[0]
    : userPayload.data;

  if (!user) return null;

  const runs = await getAllRuns(user.id);
  const games = await mapById(
    runs.map((run) => run.game),
    (id) => `/games/${id}`,
  );
  const categories = await mapById(
    runs.map((run) => run.category),
    (id) => `/categories/${id}`,
  );
  const levels = await mapById(
    runs.map((run) => run.level),
    (id) => `/levels/${id}`,
  );
  const platforms = await mapById(
    runs.map((run) => run.system?.platform),
    (id) => `/platforms/${id}`,
  );
  const variablesByGame = await mapById(
    Object.keys(games),
    (id) => `/games/${id}/variables`,
  );

  const grouped = new Map<string, Omit<History, "runs"> & { runs: any[] }>();

  for (const run of runs) {
    const game = games[run.game];
    const category = categories[run.category];
    if (!game || !category) continue;

    const level = run.level ? levels[run.level] : null;
    const variables = variablesByGame[run.game] ?? [];
    const valueLabels: string[] = [];
    const runDetails: string[] = [];
    const rulesetValues: string[] = [];
    const leaderboardValues: Record<string, string> = {};
    const subcategoryVariableIds = variables
      .filter((variable: ApiRecord) => variable["is-subcategory"])
      .map((variable: ApiRecord) => variable.id as string);

    for (const [variableId, valueId] of Object.entries(run.values ?? {})) {
      const variable = variables.find(
        (item: ApiRecord) => item.id === variableId,
      );
      const value = variable?.values?.values?.[valueId as string];

      if (variable?.["is-subcategory"]) {
        rulesetValues.push(`${variableId}:${valueId}`);
        leaderboardValues[variableId] = valueId as string;
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

    grouped.get(key)!.runs.push({
      id: run.id,
      date: run.date ?? run.submitted?.slice(0, 10) ?? "Unknown",
      submitted: run.submitted ?? null,
      seconds: run.times.primary_t,
      time: formatTime(run.times.primary_t),
      video: run.videos?.links?.[0]?.uri ?? null,
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

  const histories: History[] = [];

  for (const history of grouped.values()) {
    history.runs.sort((a, b) => {
      const dateOrder = a.date.localeCompare(b.date);
      return dateOrder || (a.submitted ?? "").localeCompare(b.submitted ?? "");
    });

    const seen = new Set<string>();
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
    for (const run of history.runs as InternalRun[]) {
      delete run.categoryId;
      delete run.levelId;
      delete run.leaderboardValues;
      delete run.subcategoryVariableIds;
    }
  }

  const gameIds = new Set(histories.map((history) => history.gameId));
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

  return {
    generatedAt: new Date().toISOString(),
    source: user.weblink,
    profile: {
      name: user.names.international,
      country: user.location?.country?.names?.international ?? null,
      avatar: user.assets?.image?.uri ?? user.assets?.icon?.uri ?? null,
      nameColor,
      profileUrl: user.weblink,
    },
    stats: {
      verifiedRuns: runs.length,
      platforms: new Set(
        runs.map((run) => run.system?.platform).filter(Boolean),
      ).size,
      totalRunSeconds: Math.round(
        runs.reduce(
          (total, run) => total + Number(run.times?.primary_t ?? 0),
          0,
        ),
      ),
      pbRuns: histories.reduce(
        (sum, history) => sum + history.runs.length,
        0,
      ),
      games: gameIds.size,
      histories: histories.length,
    },
    histories,
  };
}
