import type { CSSProperties } from "react";
import type { History, SiteData } from "./pb-history";

export function displayDate(value: string) {
  if (value === "Unknown") return value;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function historyLabel(history: History) {
  return [history.categoryName, history.levelName, history.variant]
    .filter(Boolean)
    .join(" · ");
}

export function archiveId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function historyAnchor(history: History) {
  return `history-${archiveId(history.id)}`;
}

export function archiveStyle(
  profile: SiteData["profile"],
): CSSProperties | undefined {
  if (!profile.nameColor?.from) return undefined;

  return {
    "--acid": profile.nameColor.from,
    "--acid-secondary": profile.nameColor.to ?? profile.nameColor.from,
    "--accent-gradient":
      profile.nameColor.to && profile.nameColor.to !== profile.nameColor.from
        ? `linear-gradient(135deg, ${profile.nameColor.from}, ${profile.nameColor.to})`
        : profile.nameColor.from,
  } as CSSProperties;
}
