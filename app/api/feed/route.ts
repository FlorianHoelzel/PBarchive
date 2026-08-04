import { NextResponse } from "next/server";
import speedrunData from "../../data/speedruns.json";
import { getUserArchive } from "../../archive-cache";
import type { History, SiteData } from "../../pb-history";

const PUBLIC_ORIGIN = "https://sumof.best";
const MAX_ITEMS = 12;

const corsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function responseHeaders(cacheControl: string) {
  return {
    ...corsHeaders,
    "Cache-Control": cacheControl,
  };
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: responseHeaders("no-store"),
    },
  );
}

function cleanUsername(value: string | null) {
  return value?.trim().replace(/^@/, "").normalize("NFKC") ?? "";
}

function archiveId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function historyLabel(history: History) {
  return [history.categoryName, history.levelName, history.variant]
    .filter(Boolean)
    .join(" / ");
}

function safeColor(value: string | null | undefined) {
  return value && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value)
    ? value
    : null;
}

function toFeed(data: SiteData) {
  const username = data.profile.name;
  const archiveUrl = `${PUBLIC_ORIGIN}/${encodeURIComponent(username)}`;
  const items = data.histories
    .flatMap((history) =>
      history.runs.map((run, index) => ({
        id: `${history.id}:${run.id}`,
        date: run.date,
        current: run.current,
        game: history.gameName,
        category: historyLabel(history),
        cover: history.gameCover,
        time: run.time,
        savedSeconds:
          index > 0 ? Math.max(0, history.runs[index - 1].seconds - run.seconds) : null,
        archiveUrl: `${archiveUrl}#history-${archiveId(history.id)}`,
      })),
    )
    .sort((a, b) => {
      const aDate = a.date === "Unknown" ? "" : a.date;
      const bDate = b.date === "Unknown" ? "" : b.date;
      return bDate.localeCompare(aDate) || b.id.localeCompare(a.id);
    })
    .slice(0, MAX_ITEMS);

  return {
    generatedAt: data.generatedAt,
    profile: {
      name: username,
      accent: safeColor(data.profile.nameColor?.from),
      archiveUrl,
    },
    totalPbs: data.stats.pbRuns,
    items,
  };
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: responseHeaders("public, max-age=86400"),
  });
}

export async function GET(request: Request) {
  const username = cleanUsername(new URL(request.url).searchParams.get("username"));

  if (!username || username.length > 64 || /[\u0000-\u001f\u007f]/.test(username)) {
    return errorResponse("Enter a valid speedrun.com username.", 400);
  }

  try {
    const data =
      username.toLowerCase() === speedrunData.profile.name.toLowerCase()
        ? speedrunData
        : await getUserArchive(username);

    if (!data) {
      return errorResponse(`No speedrun.com user named "${username}" was found.`, 404);
    }

    if (!data.histories.length) {
      return errorResponse(`${data.profile.name} has no verified personal bests.`, 404);
    }

    return NextResponse.json(toFeed(data), {
      headers: responseHeaders(
        "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      ),
    });
  } catch (error) {
    console.error(`Unable to build the Twitch PB feed for ${username}`, error);
    return errorResponse("The PB feed could not be loaded. Try again shortly.", 502);
  }
}
