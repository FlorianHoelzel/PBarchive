"use client";

import { CSSProperties, useState } from "react";
import { SpeedrunPassport, type SiteData } from "./pb-history";

function passportStyle(profile: SiteData["profile"]) {
  if (!profile.nameColor?.from) return undefined;
  return {
    "--acid": profile.nameColor.from,
    "--acid-secondary": profile.nameColor.to ?? profile.nameColor.from,
    "--accent-gradient":
      profile.nameColor.to &&
      profile.nameColor.to !== profile.nameColor.from
        ? `linear-gradient(135deg, ${profile.nameColor.from}, ${profile.nameColor.to})`
        : profile.nameColor.from,
  } as CSSProperties;
}

export default function PassportViewer({
  data,
  embedded = false,
}: {
  data: SiteData;
  embedded?: boolean;
}) {
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState<"share" | "embed" | null>(null);
  const archivePath = `/${encodeURIComponent(data.profile.name)}`;
  const passportPath = `${archivePath}/passport`;
  const embedPath = `${archivePath}/embed/passport`;
  const profileAvatar =
    data.profile.name.toLowerCase() === "volpey"
      ? "/volpey-avatar.png"
      : data.profile.avatar;

  async function copy(kind: "share" | "embed") {
    const origin = window.location.origin;
    const value =
      kind === "share"
        ? `${origin}${passportPath}`
        : `<iframe src="${origin}${embedPath}" width="1100" height="650" title="${data.profile.name}'s Speedrun Passport" loading="lazy"></iframe>`;
    await navigator.clipboard.writeText(value);
    setCopied(kind);
  }

  if (embedded) {
    return (
      <main className="passport-embed-shell" style={passportStyle(data.profile)}>
        <SpeedrunPassport
          histories={data.histories}
          owner={data.profile.name}
          archivePath={archivePath}
          embedded
        />
        <footer>
          <span>SUM OF BEST · SPEEDRUN PASSPORT</span>
          <a href={passportPath} target="_blank" rel="noreferrer">
            OPEN PASSPORT ↗
          </a>
        </footer>
      </main>
    );
  }

  return (
    <main className="passport-route-shell" style={passportStyle(data.profile)}>
      <header className="site-header">
        <div className="brand">
          <a className="brand-avatar-link" href={archivePath}>
            {profileAvatar ? (
              <img
                className="brand-avatar"
                src={profileAvatar}
                alt=""
                width="34"
                height="34"
              />
            ) : (
              <span className="brand-avatar-fallback" aria-hidden="true">
                {data.profile.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </a>
          <span
            className="brand-breadcrumb"
            role="navigation"
            aria-label="Breadcrumb"
          >
            <a href="/">SUM OF BEST</a>
            <span aria-hidden="true">/</span>
            <a className="accent-name" href={archivePath}>
              {data.profile.name.toUpperCase()}
            </a>
            <span aria-hidden="true">/</span>
            <a href="#passport">PASSPORT</a>
          </span>
        </div>
        <nav aria-label="Primary">
          <a href={archivePath}>ARCHIVE</a>
          <a href={`${archivePath}/feed`}>PB FEED</a>
          <a href={data.profile.profileUrl} target="_blank" rel="noreferrer">
            SPEEDRUN.COM ↗
          </a>
        </nav>
      </header>

      <section className="passport-route-hero">
        <div>
          <span>PORTABLE SPEEDRUN HISTORY</span>
          <h1>
            <span className="accent-name">{data.profile.name}’s</span>{" "}
            Speedrun Passport
          </h1>
          <p>
            Flip through every game in the archive, then share the passport or
            place the interactive version on another site.
          </p>
        </div>
        <div className="passport-route-actions">
          <button type="button" onClick={() => copy("share")}>
            {copied === "share" ? "LINK COPIED" : "SHARE PASSPORT"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCopied(null);
              setShowEmbed(true);
            }}
          >
            EMBED
          </button>
        </div>
      </section>

      <section className="passport-route-book" id="passport">
        <SpeedrunPassport
          histories={data.histories}
          owner={data.profile.name}
          archivePath={archivePath}
        />
      </section>

      <footer>
        <span>SUM OF BEST / PASSPORT</span>
        <p>{data.stats.games} game stamps from {data.profile.name}’s archive</p>
        <a href={archivePath}>BACK TO ARCHIVE ↑</a>
      </footer>

      {showEmbed && (
        <div
          className="embed-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowEmbed(false);
          }}
        >
          <section
            className="embed-dialog passport-embed-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Embed ${data.profile.name}'s Speedrun Passport`}
          >
            <div className="embed-dialog-heading">
              <div>
                <span>EMBED THIS PASSPORT</span>
                <h4>{data.profile.name}’s Speedrun Passport</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowEmbed(false)}
                aria-label="Close embed dialog"
              >
                ×
              </button>
            </div>
            <p>
              Paste this iframe into a website to show the interactive passport.
            </p>
            <div className="embed-live-preview passport-embed-preview">
              <div className="embed-live-preview-heading">
                <span>LIVE EMBED PREVIEW</span>
              </div>
              <iframe
                src={embedPath}
                title={`Preview of ${data.profile.name}'s Speedrun Passport`}
                loading="lazy"
              />
            </div>
            <textarea
              readOnly
              value={`<iframe src="${typeof window === "undefined" ? embedPath : `${window.location.origin}${embedPath}`}" width="1100" height="650" title="${data.profile.name}'s Speedrun Passport" loading="lazy"></iframe>`}
              aria-label="Passport embed code"
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="embed-dialog-actions">
              <button type="button" onClick={() => copy("embed")}>
                {copied === "embed" ? "COPIED" : "COPY CODE"}
              </button>
              <a href={embedPath} target="_blank" rel="noreferrer">
                OPEN FULL SIZE ↗
              </a>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
