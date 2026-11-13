importScripts("domain.js", "focus-risk.js");

const DEFAULT_WHITELIST = [
  "docs.google.com",
  "github.com",
  "localhost",
];
const HEALTH_ALARM = "rootine-focus-risk";

let refreshQueue = Promise.resolve();
let stateQueue = Promise.resolve();

async function getWhitelist() {
  const result = await chrome.storage.local.get({
    whitelist: DEFAULT_WHITELIST,
  });
  return result.whitelist;
}

async function getPlantHealth() {
  const result = await chrome.storage.local.get({
    plantHealth: RootineFocusRisk.createHealthState(),
  });
  return RootineFocusRisk.normalizeHealthState(result.plantHealth);
}

async function savePlantHealth(health) {
  await chrome.storage.local.set({ plantHealth: health });
}

function plantHealthChanged(previous, current) {
  return (
    previous.riskPercent !== current.riskPercent ||
    previous.isDead !== current.isDead ||
    previous.unfocusedSince !== current.unfocusedSince ||
    previous.lastRiskAt !== current.lastRiskAt ||
    previous.riskEvents !== current.riskEvents ||
    previous.stepsSinceRoll !== current.stepsSinceRoll
  );
}

async function scheduleRiskAlarm(health) {
  if (!health.lastRiskAt || health.isDead) {
    await chrome.alarms.clear(HEALTH_ALARM);
    return;
  }

  await chrome.alarms.create(HEALTH_ALARM, {
    when: health.lastRiskAt + RootineFocusRisk.RISK_INTERVAL_MS,
  });
}

function isRootineTab(tab) {
  return (
    RootineDomain.isRootineUrl(tab?.url || "") &&
    String(tab?.title || "").toLowerCase().includes("rootine")
  );
}

async function getBaseMonitoringState() {
  const [allTabs, activeTabs, whitelist] = await Promise.all([
    chrome.tabs.query({}),
    chrome.tabs.query({ active: true, lastFocusedWindow: true }),
    getWhitelist(),
  ]);

  const appIsOpen = allTabs.some(function (tab) {
    return isRootineTab(tab);
  });

  if (!appIsOpen) {
    return {
      state: "paused",
      message: "Open the Rootine dashboard to start focus protection.",
    };
  }

  const activeTab = activeTabs[0];
  const activeUrl = activeTab ? activeTab.url || "" : "";
  if (isRootineTab(activeTab)) {
    return {
      state: "ready",
      message: "Rootine is open. Your plant is safe while you plan.",
    };
  }

  const hostname = RootineDomain.hostnameFromUrl(activeUrl);
  if (!hostname) {
    return {
      state: "unsupported",
      message: "This browser page cannot be classified, so no risk time is counted.",
    };
  }

  if (RootineDomain.isWhitelisted(hostname, whitelist)) {
    return {
      state: "growing",
      domain: hostname,
      message: "This focus domain is allowed. Your plant is safe.",
    };
  }

  return {
    state: "wilting",
    domain: hostname,
    message: "Distraction time is running. Risk rises 1% every 6 minutes and rolls after 30 minutes.",
  };
}

async function reconcilePlantHealth(baseState) {
  const now = Date.now();
  let health = await getPlantHealth();
  const previousHealth = { ...health };
  let riskAdded = 0;
  let diedNow = false;

  if (baseState.state === "wilting" && !health.isDead) {
    health = RootineFocusRisk.beginDistraction(health, now);
    const result = RootineFocusRisk.applyElapsedRisk(health, now);
    health = result.health;
    riskAdded = result.intervalsApplied * RootineFocusRisk.RISK_INCREMENT;
    diedNow = result.diedNow;
    if (plantHealthChanged(previousHealth, health)) await savePlantHealth(health);
    await scheduleRiskAlarm(health);
  } else if (health.unfocusedSince || health.lastRiskAt) {
    health = RootineFocusRisk.endDistraction(health);
    await savePlantHealth(health);
    await scheduleRiskAlarm(health);
  }

  if (health.isDead) {
    return {
      ...baseState,
      state: "dead",
      message: diedNow
        ? "The latest risk roll was fatal. Start a new seed when you are ready."
        : "This plant has been lost. Start a new seed to try again.",
      health,
      minutesUntilRisk: null,
      minutesUntilRoll: null,
      nextRiskAt: null,
      nextRollAt: null,
      riskAdded,
    };
  }

  return {
    ...baseState,
    health,
    minutesUntilRisk:
      baseState.state === "wilting"
        ? RootineFocusRisk.minutesUntilRisk(health, now)
        : null,
    minutesUntilRoll:
      baseState.state === "wilting"
        ? RootineFocusRisk.minutesUntilRoll(health, now)
        : null,
    nextRiskAt:
      baseState.state === "wilting" ? RootineFocusRisk.nextRiskAt(health) : null,
    nextRollAt:
      baseState.state === "wilting" ? RootineFocusRisk.nextRollAt(health) : null,
    riskAdded,
  };
}

async function computeMonitoringState() {
  const baseState = await getBaseMonitoringState();
  return reconcilePlantHealth(baseState);
}

function getMonitoringState() {
  stateQueue = stateQueue.then(computeMonitoringState, computeMonitoringState);
  return stateQueue;
}

async function refreshBadge() {
  const current = await getMonitoringState();
  const badges = {
    paused: { text: "OFF", color: "#6b7280" },
    ready: { text: "ROOT", color: "#2f6f49" },
    unsupported: { text: "—", color: "#6b7280" },
    growing: { text: "SAFE", color: "#2f6f49" },
    wilting: { text: `${current.health.riskPercent}%`, color: "#b85f35" },
    dead: { text: "X", color: "#7f1d1d" },
  };
  const badge = badges[current.state];
  await chrome.action.setBadgeBackgroundColor({ color: badge.color });
  await chrome.action.setBadgeText({ text: badge.text });
}

function queueRefresh() {
  refreshQueue = refreshQueue.then(refreshBadge, refreshBadge);
  return refreshQueue;
}

chrome.runtime.onMessage.addListener(function (request, _sender, sendResponse) {
  if (request.type === "GET_STATE") {
    getMonitoringState()
      .then(sendResponse)
      .catch(function () {
        sendResponse({
          state: "error",
          message: "Rootine could not check this tab. Try reloading the extension.",
        });
      });
    return true;
  }

  if (request.type === "RESET_PLANT") {
    savePlantHealth(RootineFocusRisk.createHealthState())
      .then(queueRefresh)
      .then(function () {
        sendResponse({ ok: true });
      })
      .catch(function () {
        sendResponse({ ok: false });
      });
    return true;
  }

  return false;
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === HEALTH_ALARM) queueRefresh();
});
chrome.tabs.onActivated.addListener(queueRefresh);
chrome.tabs.onRemoved.addListener(queueRefresh);
chrome.tabs.onUpdated.addListener(function (_tabId, changeInfo) {
  if (changeInfo.status || changeInfo.url) queueRefresh();
});
chrome.windows.onFocusChanged.addListener(queueRefresh);
chrome.storage.onChanged.addListener(function (changes) {
  if (changes.whitelist) queueRefresh();
});
chrome.runtime.onInstalled.addListener(queueRefresh);
chrome.runtime.onStartup.addListener(queueRefresh);
