const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const API_ORIGIN = LOCAL_HOSTS.has(window.location.hostname) ? "" : "https://sumof.best";
const CONFIG_VERSION = "1";

const form = document.querySelector("#config-form");
const input = document.querySelector("#username");
const button = document.querySelector("#save-button");
const status = document.querySelector("#form-status");

let authorized = false;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.dataset.kind = kind;
}

function savedUsername() {
  const segment = window.Twitch?.ext?.configuration?.broadcaster;
  if (!segment?.content) return "";
  try {
    const config = JSON.parse(segment.content);
    return typeof config.username === "string" ? config.username : "";
  } catch {
    return "";
  }
}

async function validateUsername(username) {
  const endpoint = new URL(`${API_ORIGIN}/api/feed`, window.location.origin);
  endpoint.searchParams.set("username", username);
  const response = await fetch(endpoint);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "That profile could not be loaded.");
  return data.profile.name;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = input.value.trim().replace(/^@/, "");

  if (!username) {
    setStatus("Enter a speedrun.com username.", "error");
    input.focus();
    return;
  }

  if (!authorized || !window.Twitch?.ext?.configuration) {
    setStatus("Open this page from the Twitch Extension Manager to save.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "CHECKING PROFILE";
  setStatus("Checking verified runs...");

  try {
    const canonicalUsername = await validateUsername(username);
    window.Twitch.ext.configuration.set(
      "broadcaster",
      CONFIG_VERSION,
      JSON.stringify({ username: canonicalUsername }),
    );
    input.value = canonicalUsername;
    setStatus(`Saved @${canonicalUsername}. The panel is ready to activate.`, "success");
    button.textContent = "PROFILE SAVED";
  } catch (error) {
    setStatus(error.message || "The profile could not be saved.", "error");
    button.textContent = "SAVE PROFILE";
  } finally {
    button.disabled = false;
  }
});

if (window.Twitch?.ext) {
  window.Twitch.ext.onAuthorized(() => {
    authorized = true;
    button.disabled = false;
  });

  window.Twitch.ext.configuration.onChanged(() => {
    const username = savedUsername();
    if (username) {
      input.value = username;
      setStatus(`Currently showing @${username}.`);
    }
  });

  window.Twitch.ext.onError(() => {
    setStatus("Twitch could not authorize the configuration page. Reload and try again.", "error");
  });
} else {
  button.disabled = false;
  setStatus("Standalone preview. Open this page in Twitch to save changes.");
}
