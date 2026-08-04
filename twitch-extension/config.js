const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const API_ORIGIN = LOCAL_HOSTS.has(window.location.hostname) ? "" : "https://sumof.best";
const CONFIG_VERSION = "1";
const DEFAULT_CONFIG = {
  username: "",
  mode: "feed",
  feedCount: 3,
  historyId: "",
  useProfileColor: true,
};

const form = document.querySelector("#config-form");
const usernameInput = document.querySelector("#username");
const loadButton = document.querySelector("#load-button");
const saveButton = document.querySelector("#save-button");
const status = document.querySelector("#form-status");
const displaySettings = document.querySelector("#display-settings");
const feedSettings = document.querySelector("#feed-settings");
const historySettings = document.querySelector("#history-settings");
const feedCount = document.querySelector("#feed-count");
const historySelect = document.querySelector("#history-id");
const historySummary = document.querySelector("#history-summary");
const useProfileColor = document.querySelector("#use-profile-color");
const modeInputs = [...document.querySelectorAll('input[name="mode"]')];

let authorized = false;
let loadedProfile = null;
let requestedConfig = null;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.dataset.kind = kind;
}

function cleanUsername(value) {
  return value.trim().replace(/^@/, "");
}

function selectedMode() {
  return modeInputs.find((input) => input.checked)?.value ?? "feed";
}

function savedConfig() {
  const segment = window.Twitch?.ext?.configuration?.broadcaster;
  if (!segment?.content) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(segment.content);
    return {
      username: typeof parsed.username === "string" ? parsed.username : "",
      mode: parsed.mode === "history" ? "history" : "feed",
      feedCount: Number.isInteger(parsed.feedCount)
        ? Math.min(12, Math.max(1, parsed.feedCount))
        : 3,
      historyId: typeof parsed.historyId === "string" ? parsed.historyId : "",
      useProfileColor: parsed.useProfileColor !== false,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function setMode(mode) {
  const safeMode = mode === "history" ? "history" : "feed";
  for (const input of modeInputs) input.checked = input.value === safeMode;
  feedSettings.hidden = safeMode !== "feed";
  historySettings.hidden = safeMode !== "history";
}

function updateHistorySummary() {
  const category = loadedProfile?.categories.find(
    (item) => item.id === historySelect.value,
  );
  historySummary.textContent = category
    ? `${category.pbCount} PB${category.pbCount === 1 ? "" : "s"}, current time ${category.currentTime}`
    : "Choose a category with at least one verified PB.";
}

function populateCategories(categories, selectedId = "") {
  const options = categories.map((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = `${category.game} / ${category.category} (${category.pbCount})`;
    return option;
  });
  historySelect.replaceChildren(...options);
  if (selectedId && categories.some((category) => category.id === selectedId)) {
    historySelect.value = selectedId;
  }
  updateHistorySummary();
}

async function fetchProfile(username) {
  const endpoint = new URL(`${API_ORIGIN}/api/feed`, window.location.origin);
  endpoint.searchParams.set("username", username);
  endpoint.searchParams.set("view", "categories");
  const response = await fetch(endpoint);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "That profile could not be loaded.");
  return data;
}

async function loadProfile(config = null) {
  const username = cleanUsername(usernameInput.value);
  if (!username) {
    setStatus("Enter a speedrun.com username.", "error");
    usernameInput.focus();
    return false;
  }

  loadButton.disabled = true;
  loadButton.textContent = "LOADING PROFILE";
  saveButton.disabled = true;
  setStatus("Loading games, categories, and verified PBs...");

  try {
    const data = await fetchProfile(username);
    loadedProfile = data;
    usernameInput.value = data.profile.name;
    populateCategories(data.categories, config?.historyId);
    displaySettings.hidden = false;

    if (config) {
      setMode(config.mode);
      useProfileColor.checked = config.useProfileColor;
      const countValue = String(config.feedCount);
      feedCount.value = [...feedCount.options].some((option) => option.value === countValue)
        ? countValue
        : "3";
    }

    saveButton.disabled = !authorized;
    setStatus(
      `Loaded @${data.profile.name}: ${data.categories.length} categories and ${data.totalPbs} PBs.`,
      "success",
    );
    return true;
  } catch (error) {
    loadedProfile = null;
    displaySettings.hidden = true;
    setStatus(error.message || "The profile could not be loaded.", "error");
    return false;
  } finally {
    loadButton.disabled = false;
    loadButton.textContent = "LOAD PROFILE";
  }
}

async function applySavedConfig() {
  const config = savedConfig();
  if (!config.username) return;
  requestedConfig = config;
  usernameInput.value = config.username;
  await loadProfile(config);
}

for (const input of modeInputs) {
  input.addEventListener("change", () => setMode(selectedMode()));
}

historySelect.addEventListener("change", updateHistorySummary);

usernameInput.addEventListener("input", () => {
  if (
    loadedProfile &&
    cleanUsername(usernameInput.value).toLowerCase() !== loadedProfile.profile.name.toLowerCase()
  ) {
    loadedProfile = null;
    displaySettings.hidden = true;
    saveButton.disabled = true;
    setStatus("Load this profile to choose its panel settings.");
  }
});

loadButton.addEventListener("click", () => loadProfile());

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!loadedProfile) {
    await loadProfile();
    if (!loadedProfile) return;
  }

  if (!authorized || !window.Twitch?.ext?.configuration) {
    setStatus("Open this page from the Twitch Extension Manager to save.", "error");
    return;
  }

  const mode = selectedMode();
  if (mode === "history" && !historySelect.value) {
    setStatus("Choose a category for the history view.", "error");
    historySelect.focus();
    return;
  }

  const config = {
    username: loadedProfile.profile.name,
    mode,
    feedCount: Number.parseInt(feedCount.value, 10),
    historyId: mode === "history" ? historySelect.value : "",
    useProfileColor: useProfileColor.checked,
  };

  saveButton.disabled = true;
  saveButton.textContent = "SAVING PANEL";
  window.Twitch.ext.configuration.set(
    "broadcaster",
    CONFIG_VERSION,
    JSON.stringify(config),
  );
  requestedConfig = config;
  setStatus(
    mode === "history"
      ? `Saved @${config.username}'s selected category history.`
      : `Saved @${config.username}'s ${config.feedCount}-PB feed.`,
    "success",
  );
  saveButton.textContent = "PANEL SAVED";
  saveButton.disabled = false;
});

const previewUsername = new URLSearchParams(window.location.search).get("username");
if (previewUsername && !usernameInput.value) usernameInput.value = previewUsername;

if (window.Twitch?.ext) {
  window.Twitch.ext.onAuthorized(() => {
    authorized = true;
    if (loadedProfile) saveButton.disabled = false;
  });

  window.Twitch.ext.configuration.onChanged(() => {
    const config = savedConfig();
    const isRequestedSave =
      requestedConfig && JSON.stringify(config) === JSON.stringify(requestedConfig);
    requestedConfig = null;
    if (!isRequestedSave) void applySavedConfig();
  });

  window.Twitch.ext.onError(() => {
    setStatus("Twitch could not authorize the configuration page. Reload and try again.", "error");
  });
} else {
  usernameInput.value = previewUsername || "volpey";
  loadButton.disabled = false;
  setStatus("Standalone preview. Open this page in Twitch to save changes.");
}
