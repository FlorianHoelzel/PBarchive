const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const API_ORIGIN = LOCAL_HOSTS.has(window.location.hostname) ? "" : "https://sumof.best";
const FALLBACK_ACCENT = "#c8c7c2";
const PANEL_BACKGROUND = "#0e0e0e";
const MINIMUM_CONTRAST = 4.5;
const DEFAULT_CONFIG = {
  username: "volpey",
  mode: "feed",
  feedCount: 3,
  historyId: "",
  useProfileColor: true,
};
const SVG_NS = "http://www.w3.org/2000/svg";

const elements = {
  shell: document.querySelector(".panel-shell"),
  loading: document.querySelector("#loading-state"),
  message: document.querySelector("#message-state"),
  messageLabel: document.querySelector("#message-label"),
  messageTitle: document.querySelector("#message-title"),
  messageCopy: document.querySelector("#message-copy"),
  retry: document.querySelector("#retry-button"),
  feed: document.querySelector("#feed-list"),
  history: document.querySelector("#history-view"),
  kicker: document.querySelector("#panel-kicker"),
  profileName: document.querySelector("#profile-name"),
  subtitle: document.querySelector("#panel-subtitle"),
  pbCount: document.querySelector("#pb-count"),
  archiveLink: document.querySelector("#archive-link"),
  footerLabel: document.querySelector("#footer-label"),
  historyCount: document.querySelector("#history-count"),
  chart: document.querySelector("#history-chart"),
  startDate: document.querySelector("#history-start-date"),
  endDate: document.querySelector("#history-end-date"),
  selectedDate: document.querySelector("#selected-date"),
  selectedTime: document.querySelector("#selected-time"),
  selectedLink: document.querySelector("#selected-link"),
  historyList: document.querySelector("#history-list"),
};

let activeRequestKey = "";
let activeConfig = DEFAULT_CONFIG;
let requestController = null;

function normalizeConfig(value = {}) {
  const feedCount = Number.parseInt(value.feedCount, 10);
  return {
    username:
      typeof value.username === "string" && value.username.trim()
        ? value.username.trim().replace(/^@/, "")
        : DEFAULT_CONFIG.username,
    mode: value.mode === "history" ? "history" : "feed",
    feedCount: Number.isFinite(feedCount) ? Math.min(12, Math.max(1, feedCount)) : 3,
    historyId: typeof value.historyId === "string" ? value.historyId : "",
    useProfileColor: value.useProfileColor !== false && value.useProfileColor !== "false",
  };
}

function configuredPanel() {
  const segment = window.Twitch?.ext?.configuration?.broadcaster;
  if (!segment?.content) return null;
  try {
    return normalizeConfig(JSON.parse(segment.content));
  } catch {
    return null;
  }
}

function showOnly(name) {
  elements.loading.hidden = name !== "loading";
  elements.message.hidden = name !== "message";
  elements.feed.hidden = name !== "feed";
  elements.history.hidden = name !== "history";
}

function showMessage(label, title, copy, retry = false) {
  elements.shell.classList.remove("history-mode");
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

function relativeLuminance(color) {
  const rgb = parseHex(color);
  if (!rgb) return null;
  return rgb.reduce((total, value, index) => {
    const channel = value / 255;
    const linear = channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
    return total + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
}

function readableAccent(color) {
  const accentLuminance = relativeLuminance(color);
  const backgroundLuminance = relativeLuminance(PANEL_BACKGROUND);
  if (accentLuminance === null || backgroundLuminance === null) return FALLBACK_ACCENT;
  const contrast =
    (Math.max(accentLuminance, backgroundLuminance) + 0.05) /
    (Math.min(accentLuminance, backgroundLuminance) + 0.05);
  return contrast >= MINIMUM_CONTRAST ? color : FALLBACK_ACCENT;
}

function applyAccent(color) {
  const accent = activeConfig.useProfileColor ? readableAccent(color) : FALLBACK_ACCENT;
  document.documentElement.style.setProperty("--accent", accent);
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

function renderFeed(data, count) {
  applyAccent(data.profile.accent);
  elements.shell.classList.remove("history-mode");
  elements.kicker.textContent = "PB FEED";
  elements.profileName.textContent = `@${data.profile.name}`;
  elements.subtitle.hidden = true;
  elements.pbCount.textContent = `${data.totalPbs} PBS`;
  elements.archiveLink.href = data.profile.archiveUrl;
  elements.footerLabel.textContent = "RECENT PERSONAL BESTS";
  elements.feed.replaceChildren(...data.items.slice(0, count).map(rowFor));

  if (!data.items.length) {
    showMessage("NO RUNS", "No personal bests yet", "Verified personal bests will appear here when they are available.");
    return;
  }

  showOnly("feed");
}

function svgElement(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function renderChart(runs, selectedIndex) {
  const width = 292;
  const height = 112;
  const padX = 12;
  const padY = 12;
  const values = runs.map((run) => run.seconds);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const points = runs.map((run, index) => ({
    x: runs.length === 1
      ? width / 2
      : padX + (index / (runs.length - 1)) * (width - padX * 2),
    y: padY + ((max - run.seconds) / span) * (height - padY * 2),
  }));
  const path = points
    .map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`)
    .join(" ");

  const axis = svgElement("line", {
    x1: padX,
    y1: height - padY,
    x2: width - padX,
    y2: height - padY,
    class: "history-axis",
  });
  const line = svgElement("path", { d: path, class: "history-line" });
  const dots = points.map((point, index) => svgElement("circle", {
    cx: point.x,
    cy: point.y,
    r: index === selectedIndex ? 6 : 4,
    class: index === selectedIndex ? "history-dot selected" : "history-dot",
  }));
  elements.chart.replaceChildren(axis, line, ...dots);
}

function renderHistory(data) {
  const history = data.history;
  const runs = history.runs;
  let selectedIndex = runs.length - 1;

  applyAccent(data.profile.accent);
  elements.shell.classList.add("history-mode");
  elements.kicker.textContent = `@${data.profile.name} / PB HISTORY`;
  elements.profileName.textContent = history.game;
  elements.subtitle.textContent = history.category;
  elements.subtitle.hidden = false;
  elements.pbCount.textContent = `${runs.length} PB${runs.length === 1 ? "" : "S"}`;
  const timingLabel = {
    realtime: "RTA",
    realtime_noloads: "LRT",
    ingame: "IGT",
  }[history.timingMethod] ?? "TIME";
  elements.historyCount.textContent = `${timingLabel} · ${runs.length} PB${runs.length === 1 ? "" : "S"}`;
  elements.archiveLink.href = history.archiveUrl;
  elements.footerLabel.textContent = "CATEGORY ARCHIVE";
  elements.startDate.textContent = displayDate(runs[0].date);
  elements.endDate.textContent = displayDate(runs.at(-1).date);

  function selectRun(index) {
    selectedIndex = index;
    const run = runs[index];
    elements.selectedDate.textContent = displayDate(run.date);
    elements.selectedTime.textContent = run.time;
    elements.selectedLink.href = history.embedUrl;
    for (const button of elements.historyList.children) {
      const active = Number.parseInt(button.dataset.index, 10) === index;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    renderChart(runs, selectedIndex);
  }

  const buttons = runs
    .map((run, index) => ({ run, index }))
    .reverse()
    .map(({ run, index }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.index = String(index);
      button.setAttribute("aria-label", `Select ${displayDate(run.date)}, ${run.time}`);

      const date = document.createElement("span");
      date.textContent = displayDate(run.date);
      const time = document.createElement("strong");
      time.textContent = run.time;
      button.append(date, time);
      button.addEventListener("click", () => selectRun(index));
      return button;
    });

  elements.historyList.replaceChildren(...buttons);
  selectRun(selectedIndex);
  showOnly("history");
}

async function loadPanel(configValue) {
  const config = normalizeConfig(configValue);
  const requestKey = JSON.stringify(config);
  if (requestKey === activeRequestKey) return;

  activeConfig = config;
  activeRequestKey = requestKey;
  requestController?.abort();
  requestController = new AbortController();
  showOnly("loading");

  try {
    const endpoint = new URL(`${API_ORIGIN}/api/feed`, window.location.origin);
    endpoint.searchParams.set("username", config.username);
    if (config.mode === "history") {
      if (!config.historyId) {
        throw new Error("Choose a category in the extension configuration.");
      }
      endpoint.searchParams.set("history", config.historyId);
    }
    const response = await fetch(endpoint, { signal: requestController.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The panel could not be loaded.");
    if (config.mode === "history") renderHistory(data);
    else renderFeed(data, config.feedCount);
  } catch (error) {
    if (error.name === "AbortError") return;
    showMessage("PANEL UNAVAILABLE", "Could not load personal bests", error.message, true);
  }
}

elements.retry.addEventListener("click", () => {
  activeRequestKey = "";
  void loadPanel(activeConfig);
});

const query = new URLSearchParams(window.location.search);
const previewConfig = normalizeConfig({
  username: query.get("username") || DEFAULT_CONFIG.username,
  mode: query.get("mode") || DEFAULT_CONFIG.mode,
  feedCount: query.get("count") || DEFAULT_CONFIG.feedCount,
  historyId: query.get("history") || "",
  useProfileColor: query.get("profileColor") ?? true,
});
void loadPanel(configuredPanel() || previewConfig);

if (window.Twitch?.ext) {
  window.Twitch.ext.configuration.onChanged(() => {
    const config = configuredPanel();
    if (config) void loadPanel(config);
  });

  window.Twitch.ext.onError(() => {
    if (!activeRequestKey) {
      showMessage("TWITCH ERROR", "Extension connection failed", "Reload the channel page and try again.", true);
    }
  });
}
