import { ImageResponse } from "next/og";
import arimoBoldFontDataUrl from "../../../public/fonts/arimo-bold.ttf?inline";
import speedrunData from "../../data/speedruns.json";
import { getUserArchive } from "../../archive-cache";

const arimoBoldFont = fetch(arimoBoldFontDataUrl).then((response) =>
  response.arrayBuffer(),
);

function safeAccent(value: string | null | undefined) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#c8c7c2";
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
  const years = data.histories
    .flatMap((history) => history.runs)
    .map((run) => run.date.slice(0, 4))
    .filter((year) => /^\d{4}$/.test(year))
    .map(Number);
  const yearRange = years.length
    ? `${Math.min(...years)} / ${Math.max(...years)}`
    : "ARCHIVE READY";
  const gridColumns = Array.from({ length: 32 }, (_, index) => index * 38);
  const gridRows = Array.from({ length: 17 }, (_, index) => index * 38);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0e0e0e",
          color: "#f1f0ec",
          fontFamily: "Arimo",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.58,
          }}
        >
          {gridColumns.map((left) => (
            <div
              key={`column-${left}`}
              style={{
                position: "absolute",
                left,
                top: 0,
                width: 1,
                height: 630,
                background: "#242422",
              }}
            />
          ))}
          {gridRows.map((top) => (
            <div
              key={`row-${top}`}
              style={{
                position: "absolute",
                left: 0,
                top,
                width: 1200,
                height: 1,
                background: "#242422",
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            height: 8,
            width: "100%",
            background: accent,
          }}
        />

        <header
          style={{
            height: 82,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 54px",
            borderBottom: "1px solid #444440",
            background: "rgba(14,14,14,0.88)",
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.16em" }}>
            SUM OF BEST
          </span>
          <span
            style={{
              color: "#9d9d99",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.13em",
            }}
          >
            SPEEDRUN.COM PB ARCHIVE
          </span>
        </header>

        <main style={{ display: "flex", flex: 1, padding: "40px 54px 34px" }}>
          <section
            style={{
              width: 742,
              display: "flex",
              flexDirection: "column",
              paddingRight: 48,
              borderRight: "1px solid #444440",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                color: accent,
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              <span>01</span>
              <span style={{ color: "#666660" }}>/</span>
              <span>@{name.toUpperCase()}</span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 30,
                fontSize: 86,
                fontWeight: 700,
                letterSpacing: "-0.055em",
                lineHeight: 0.88,
              }}
            >
              <span>PERSONAL BEST</span>
              <span style={{ color: accent }}>HISTORY</span>
            </div>

            <span
              style={{
                width: 610,
                marginTop: 32,
                color: "#b6b5b0",
                fontSize: 21,
                lineHeight: 1.35,
              }}
            >
              Current records, obsolete PBs, and every improvement in between.
            </span>
          </section>

          <aside
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              paddingLeft: 42,
            }}
          >
            <span
              style={{
                color: "#9d9d99",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.13em",
                marginBottom: 18,
              }}
            >
              ARCHIVE AT A GLANCE
            </span>

            {[
              [data.stats.pbRuns, "PB MILESTONES"],
              [data.stats.games, "GAMES"],
              [data.stats.histories, "CATEGORIES"],
            ].map(([value, label]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  borderTop: "1px solid #444440",
                  padding: "15px 0 13px",
                }}
              >
                <span style={{ color: accent, fontSize: 38, fontWeight: 700 }}>
                  {value}
                </span>
                <span
                  style={{
                    color: "#b6b5b0",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </aside>
        </main>

        <footer
          style={{
            height: 66,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 54px",
            borderTop: "1px solid #444440",
            background: "rgba(14,14,14,0.9)",
            color: "#9d9d99",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.11em",
          }}
        >
          <span>{yearRange}</span>
          <span style={{ color: accent }}>SUMOF.BEST/{name.toUpperCase()}</span>
        </footer>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Arimo",
          data: await arimoBoldFont,
          weight: 700,
          style: "normal",
        },
      ],
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );

  // Materialize the lazy ImageResponse body before returning so renderer
  // failures become normal route errors instead of dropped HTTP connections.
  const png = await image.arrayBuffer();

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
