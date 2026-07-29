export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("url");

  try {
    if (!source) throw new Error("Missing cover URL");
    const coverUrl = new URL(source);
    const isSpeedrunCover =
      coverUrl.protocol === "https:" &&
      coverUrl.hostname === "www.speedrun.com" &&
      coverUrl.pathname.startsWith("/static/game/");
    if (!isSpeedrunCover) throw new Error("Invalid cover URL");

    const response = await fetch(coverUrl, {
      headers: {
        Accept: "image/*",
        "User-Agent": "PBArchive/0.1 (game cover palette)",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("image/")) {
      return new Response(null, { status: 502 });
    }

    return new Response(response.body, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "Content-Type": contentType,
      },
    });
  } catch {
    return new Response(null, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
