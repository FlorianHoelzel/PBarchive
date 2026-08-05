import type { History, SiteData } from "./pb-history";
import { requestSpeedrunJson } from "./speedrun-api";

const USER_AGENT =
  "SumOfBest/0.1 (live archive preview; https://sumof.best)";

// speedrun.com responses are schemaless at this boundary and are normalized below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRecord = Record<string, any>;

async function request(path: string, allowNotFound = false) {
  return requestSpeedrunJson<ApiRecord>(path, {
    allowNotFound,
    userAgent: USER_AGENT,
  });
}

async function get(path: string) {
  return (await request(path))!;
}

async function getOptional(path: string) {
  return request(path, true);
}

function embeddedData(value: unknown): ApiRecord | null {
  if (!value || typeof value !== "object") return null;
  const data = (value as ApiRecord).data;
  return data && typeof data === "object" ? data : null;
}

async function getAllRuns(userId: string) {
  const runs: ApiRecord[] = [];
  const categories: Record<string, ApiRecord> = {};
  const levels: Record<string, ApiRecord> = {};
  const platforms: Record<string, ApiRecord> = {};
  let offset = 0;

  while (true) {
    const payload = await get(
      `/runs?user=${userId}&status=verified&orderby=date&direction=asc&max=200&offset=${offset}&embed=category,level,platform`,
    );
    for (const rawRun of payload.data ?? []) {
      const category = embeddedData(rawRun.category);
      const level = embeddedData(rawRun.level);
      const platform = embeddedData(rawRun.platform);
      if (category?.id) categories[category.id] = category;
      if (level?.id) levels[level.id] = level;
      if (platform?.id) platforms[platform.id] = platform;

      runs.push({
        ...rawRun,
        category: category?.id ?? rawRun.category,
        level: level?.id ?? null,
      });
    }
    const pagination = payload.pagination;

    if (!pagination?.links?.some((link: ApiRecord) => link.rel === "next")) {
      break;
    }

    offset += pagination.max;
  }

  return { runs, categories, levels, platforms };
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

type InternalRun = History["runs"][number] & {
  submitted?: string | null;
};

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

  const runData = await getAllRuns(user.id);
  const runs = runData.runs;
  const games = await mapById(
    runs.map((run) => run.game),
    (id) => `/games/${id}?embed=variables`,
  );
  const categories = runData.categories;
  const levels = runData.levels;
  const platforms = runData.platforms;
  const variablesByGame = Object.fromEntries(
    Object.entries(games).map(([id, game]) => [
      id,
      Array.isArray(game.variables?.data) ? game.variables.data : [],
    ]),
  ) as Record<string, ApiRecord[]>;

  const grouped = new Map<
    string,
    Omit<History, "runs"> & { runs: InternalRun[] }
  >();

  for (const run of runs) {
    const game = games[run.game];
    const category = categories[run.category];
    if (!game || !category) continue;

    const level = run.level ? levels[run.level] : null;
    const variables = variablesByGame[run.game] ?? [];
    const valueLabels: string[] = [];
    const runDetails: string[] = [];
    const rulesetValues: string[] = [];
    for (const [variableId, valueId] of Object.entries(run.values ?? {})) {
      const variable = variables.find(
        (item: ApiRecord) => item.id === variableId,
      );
      const value = variable?.values?.values?.[valueId as string];

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
