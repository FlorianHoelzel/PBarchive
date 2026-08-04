const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const API_ORIGIN = LOCAL_HOSTS.has(window.location.hostname) ? "" : "https://sumof.best";
const FALLBACK_ACCENT = "#c8c7c2";
const DEFAULT_USERNAME = "volpey";

const elements = {
  loading: document.querySelector("#loading-state"),
  message: document.querySelector("#message-state"),
  messageLabel: document.querySelector("#message-label"),
  messageTitle: document.querySelector("#message-title"),
  messageCopy: document.querySelector("#message-copy"),
  retry: document.querySelector("#retry-button"),
  feed: document.querySelector("#feed-list"),
  profileName: document.querySelector("#profile-name"),
  pbCount: document.querySelector("#pb-count"),
  archiveLink: document.querySelector("#archive-link"),
};

let activeUsername = "";
let requestController = null;

function showOnly(name) {
  elements.loading.hidden = name !== "loading";
  elements.message.hidden = name !== "message";
  elements.feed.hidden = name !== "feed";
}

function showMessage(label, title, copy, retry = false) {
  elements.messageLabel.textContent = label;
  elements.messageTitle.textContent = title;
  elements.messageCopy.textContent = copy;
  elements.retry.hidden = !retry;
  showOnly("message");
}

function parseHex(color) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color ?? "");
  if (!match) return null;
  const value = match[1].length === 3
    ? [...match[1]].map((digit) => digit + digit).join("")
    : match[1];
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function readableAccent(color) {
  const rgb = parseHex(color);
  if (!rgb) return FALLBACK_ACCENT;
  const luminance = rgb.reduce((total, value, index) => {
    const channel = value / 255;
    const linear = channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
    return total + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
  return luminance >= 0.3 ? color : FALLBACK_ACCENT;
}

function displayDate(value) {
  if (!value || value === "Unknown") return "DATE UNKNOWN";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`)).toUpperCase();
}

function savedTime(seconds) {
  if (seconds === null || seconds === undefined) return "FIRST PB";
  if (seconds < 60) {
    const precision = seconds < 10 ? 2 : 1;
    return `-${seconds.toFixed(precision).replace(/\.0+$/, "")}S`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `-${minutes}M ${remainder}S`;
}

function coverFor(item) {
  const cover = document.createElement("div");
  cover.className = "feed-cover";

  if (item.cover) {
    const image = document.createElement("img");
    image.src = item.cover;
    image.alt = "";
    image.loading = "lazy";
    cover.append(image);
  } else {
    const initials = document.createElement("span");
    initials.textContent = item.game.slice(0, 2).toUpperCase();
    cover.append(initials);
  }

  return cover;
}

function rowFor(item) {
  const link = document.createElement("a");
  link.className = "feed-row";
  link.href = item.archiveUrl;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.setAttribute("aria-label", `Open ${item.game}, ${item.category}, in ${item.time}`);

  const copy = document.createElement("div");
  copy.className = "feed-copy";

  const date = document.createElement("span");
  date.className = "feed-date";
  date.textContent = displayDate(item.date);

  const game = document.createElement("h2");
  game.textContent = item.game;

  const category = document.createElement("p");
  category.textContent = item.category;

  const improvement = document.createElement("small");
  improvement.textContent = item.current
    ? `${savedTime(item.savedSeconds)} / CURRENT`
    : savedTime(item.savedSeconds);

  const time = document.createElement("strong");
  time.textContent = item.time;

  copy.append(date, game, category, improvement);
  link.append(coverFor(item), copy, time);
  return link;
}

function renderFeed(data) {
  document.documentElement.style.setProperty("--accent", readableAccent(data.profile.accent));
  elements.profileName.textContent = `@${data.profile.name}`;
  elements.pbCount.textContent = `${data.totalPbs} PBS`;
  elements.archiveLink.href = data.profile.archiveUrl;
  elements.feed.replaceChildren(...data.items.slice(0, 3).map(rowFor));

  if (!data.items.length) {
    showMessage("NO RUNS", "No personal bests yet", "Verified personal bests will appear here when they are available.");
    return;
  }

  showOnly("feed");
}

async function loadFeed(username) {
  const cleanUsername = username.trim().replace(/^@/, "");
  if (!cleanUsername || cleanUsername === activeUsername) return;

  activeUsername = cleanUsername;
  requestController?.abort();
  requestController = new AbortController();
  showOnly("loading");

  try {
    const endpoint = new URL(`${API_ORIGIN}/api/feed`, window.location.origin);
    endpoint.searchParams.set("username", cleanUsername);
    const response = await fetch(endpoint, { signal: requestController.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The PB feed could not be loaded.");
    renderFeed(data);
  } catch (error) {
    if (error.name === "AbortError") return;
    showMessage("FEED UNAVAILABLE", "Could not load personal bests", error.message, true);
  }
}

function configuredUsername() {
  const segment = window.Twitch?.ext?.configuration?.broadcaster;
  if (!segment?.content) return "";
  try {
    const config = JSON.parse(segment.content);
    return typeof config.username === "string" ? config.username : "";
  } catch {
    return "";
  }
}

elements.retry.addEventListener("click", () => {
  const username = activeUsername;
  activeUsername = "";
  loadFeed(username);
});

const previewUsername = new URLSearchParams(window.location.search).get("username");
const initialUsername = previewUsername || DEFAULT_USERNAME;
loadFeed(initialUsername);

if (window.Twitch?.ext) {
  window.Twitch.ext.configuration.onChanged(() => {
    const username = configuredUsername();
    if (username) loadFeed(username);
    else if (!activeUsername) loadFeed(initialUsername);
  });

  window.Twitch.ext.onError(() => {
    if (!activeUsername && !previewUsername) {
      showMessage("TWITCH ERROR", "Extension connection failed", "Reload the channel page and try again.", true);
    }
  });
}
