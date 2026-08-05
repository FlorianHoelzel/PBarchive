import { NextResponse } from "next/server";
import { warmUserArchive } from "../../archive-cache";

type SpeedrunUser = {
  id: string;
  names?: { international?: string };
  weblink?: string;
  assets?: {
    image?: { uri?: string };
    icon?: { uri?: string };
  };
  "name-style"?: {
    style?: string;
    color?: { dark?: string };
    "color-from"?: { dark?: string };
    "color-to"?: { dark?: string };
  };
  location?: {
    country?: {
      names?: { international?: string };
    };
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim().replace(/^@/, "");
  const prepareArchive = searchParams.get("prepare") === "1";

  if (!username || username.length > 64) {
    return NextResponse.json(
      { error: "Enter a valid speedrun.com username." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const response = await fetch(
      `https://www.speedrun.com/api/v1/users?lookup=${encodeURIComponent(username)}`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "SumOfBest/0.1 (username lookup; https://sumof.best)",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Speedrun.com could not be reached. Try again in a moment." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const payload = (await response.json()) as { data?: SpeedrunUser[] };
    const user = payload.data?.[0];

    if (!user) {
      return NextResponse.json(
        { error: `No speedrun.com user named “${username}” was found.` },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const name = user.names?.international ?? username;
    if (prepareArchive) warmUserArchive(name);
    const country = user.location?.country?.names?.international ?? null;
    const sourceAvatar =
      user.assets?.image?.uri ?? user.assets?.icon?.uri ?? null;
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

    return NextResponse.json(
      {
        id: user.id,
        name,
        country,
        avatar: sourceAvatar,
        nameColor,
        profileUrl: user.weblink ?? `https://www.speedrun.com/users/${name}`,
        archiveUrl: `/${encodeURIComponent(name)}`,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json(
      { error: "The lookup failed. Check your connection and try again." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
