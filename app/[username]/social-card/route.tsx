import { ImageResponse } from "next/og";
import speedrunData from "../../data/speedruns.json";
import { getUserArchive } from "../../archive-cache";

function safeAccent(value: string | null | undefined) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#c8ff00";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);
  const data =
    decodedUsername.toLowerCase() === speedrunData.profile.name.toLowerCase()
      ? speedrunData
      : await getUserArchive(decodedUsername);

  if (!data) return new Response("Archive not found", { status: 404 });

  const name = data.profile.name;
  const accent = safeAccent(data.profile.nameColor?.from);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e0e0e",
          color: "#f1f0ec",
          padding: "64px 72px",
          fontFamily: "Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            width: "720px",
            height: "720px",
            right: "-250px",
            top: "-330px",
            border: `2px solid ${accent}`,
            borderRadius: "50%",
            opacity: 0.32,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.14em",
          }}
        >
          <span>SUM OF BEST</span>
          <span style={{ color: accent }}>SPEEDRUN PB ARCHIVE</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          <span
            style={{
              color: accent,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.12em",
              marginBottom: 18,
            }}
          >
            @{name.toUpperCase()}
          </span>
          <span
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: 108,
              fontWeight: 900,
              letterSpacing: "-0.055em",
              lineHeight: 0.92,
              WebkitTextStroke: "1.5px #f1f0ec",
            }}
          >
            PERSONAL BEST HISTORY
          </span>
        </div>

        <div
          style={{
            display: "flex",
            borderTop: "1px solid #454541",
            paddingTop: 28,
            gap: 64,
          }}
        >
          {[
            [data.stats.pbRuns, "PB MILESTONES"],
            [data.stats.games, "GAMES"],
            [data.stats.histories, "CATEGORIES"],
          ].map(([value, label]) => (
            <div
              key={label}
              style={{ display: "flex", flexDirection: "column", gap: 3 }}
            >
              <span style={{ color: accent, fontSize: 42, fontWeight: 900 }}>
                {value}
              </span>
              <span
                style={{
                  color: "#aaa9a4",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                }}
              >
                {label}
              </span>
            </div>
          ))}
          <span
            style={{
              marginLeft: "auto",
              alignSelf: "flex-end",
              color: "#aaa9a4",
              fontSize: 18,
            }}
          >
            sumof.best
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
