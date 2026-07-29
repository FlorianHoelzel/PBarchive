import { NextResponse } from "next/server";

type SpeedrunUser = {
  id: string;
  names?: { international?: string };
  weblink?: string;
  assets?: {
    image?: { uri?: string };
    icon?: { uri?: string };
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
          "User-Agent": "PBArchive/0.1 (username lookup)",
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
    const country = user.location?.country?.names?.international ?? null;

    return NextResponse.json(
      {
        id: user.id,
        name,
        country,
        avatar: user.assets?.image?.uri ?? user.assets?.icon?.uri ?? null,
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
