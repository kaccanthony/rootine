const DEFAULT_WHITELIST = [
  "docs.google.com",
  "github.com",
  "localhost",
];

const plantCard = document.getElementById("plant-card");
const plant = document.getElementById("plant");
const statusHeading = document.getElementById("status-heading");
const statusMessage = document.getElementById("status-message");
const checkedDomain = document.getElementById("checked-domain");
const riskPercent = document.getElementById("risk-percent");
const riskTrack = document.getElementById("risk-track");
const riskBar = document.getElementById("risk-bar");
const riskNote = document.getElementById("risk-note");
const replantButton = document.getElementById("replant-button");
const domainForm = document.getElementById("domain-form");
const domainInput = document.getElementById("domain-input");
const domainList = document.getElementById("domain-list");
const formError = document.getElementById("form-error");

const statePresentation = {
  paused: { heading: "Focus check paused", icon: "🪴" },
  ready: { heading: "Your plant is safe", icon: "🌱" },
  unsupported: { heading: "Nothing to check here", icon: "🪴" },
  growing: { heading: "Your focus is protected", icon: "🌿" },
  wilting: { heading: "Distraction timer running", icon: "🥀" },
  dead: { heading: "This plant was lost", icon: "🥀" },
  error: { heading: "Check unavailable", icon: "🪴" },
};

let currentFocusState = null;
let lastDeadlineRefreshAt = 0;

function formatCountdown(deadline) {
  const totalSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function loadWhitelist() {
  const result = await chrome.storage.local.get({
    whitelist: DEFAULT_WHITELIST,
  });
  return result.whitelist;
}

async function renderWhitelist() {
  const whitelist = await loadWhitelist();
  domainList.replaceChildren();

  whitelist.forEach(function (domain) {
    const item = document.createElement("li");
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = `${domain} ×`;
    removeButton.setAttribute("aria-label", `Remove ${domain}`);
    removeButton.addEventListener("click", async function () {
      const updated = whitelist.filter(function (itemDomain) {
        return itemDomain !== domain;
      });
      await chrome.storage.local.set({ whitelist: updated });
      await renderWhitelist();
      await renderState();
    });
    item.append(removeButton);
    domainList.append(item);
  });
}

function renderRisk(current) {
  const health = current.health || { riskPercent: 0, isDead: false, riskEvents: 0 };
  const risk = health.riskPercent || 0;
  riskPercent.textContent = `${risk}%`;
  riskBar.style.width = `${risk}%`;
  riskTrack.setAttribute("aria-valuenow", String(risk));
  replantButton.hidden = !health.isDead;

  if (health.isDead) {
    riskNote.textContent = "The risk roll was fatal. Replanting resets the risk counter.";
  } else if (current.state === "wilting") {
    riskNote.textContent = `${formatCountdown(current.nextRiskAt)} left until +1% risk\n${formatCountdown(current.nextRollAt)} left until the death roll`;
  } else if (health.riskEvents > 0) {
    riskNote.textContent = `${health.riskEvents} distraction ${health.riskEvents === 1 ? "interval" : "intervals"} recorded.`;
  } else {
    riskNote.textContent = "No 30-minute death roll recorded.";
  }
}

async function renderState() {
  const current = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  currentFocusState = current;
  const presentation = statePresentation[current.state] || statePresentation.error;
  plantCard.dataset.state = current.state;
  plant.textContent = presentation.icon;
  statusHeading.textContent = presentation.heading;
  statusMessage.textContent = current.message;
  renderRisk(current);

  if (current.domain) {
    checkedDomain.textContent = `Checking domain: ${current.domain}`;
    checkedDomain.hidden = false;
  } else {
    checkedDomain.hidden = true;
  }
}

function updateLiveCountdown() {
  if (currentFocusState?.state !== "wilting") return;
  renderRisk(currentFocusState);

  if (
    currentFocusState.nextRiskAt <= Date.now() &&
    Date.now() - lastDeadlineRefreshAt > 1000
  ) {
    lastDeadlineRefreshAt = Date.now();
    renderState();
  }
}

domainForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  formError.textContent = "";
  const domain = RootineDomain.normalizeWhitelistEntry(domainInput.value);
  if (!domain) {
    formError.textContent = "Enter a valid domain such as example.com.";
    return;
  }

  const whitelist = await loadWhitelist();
  if (!whitelist.includes(domain)) {
    whitelist.push(domain);
    whitelist.sort();
    await chrome.storage.local.set({ whitelist });
  }
  domainInput.value = "";
  await renderWhitelist();
  await renderState();
});

replantButton.addEventListener("click", async function () {
  await chrome.runtime.sendMessage({ type: "RESET_PLANT" });
  await renderState();
});

Promise.all([renderWhitelist(), renderState()]).catch(function () {
  plantCard.dataset.state = "error";
  plant.textContent = "🪴";
  statusHeading.textContent = "Check unavailable";
  statusMessage.textContent = "Reload the extension and try again.";
});

window.setInterval(updateLiveCountdown, 1000);
