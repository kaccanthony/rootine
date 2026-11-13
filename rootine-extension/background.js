importScripts("domain.js");

const DEFAULT_WHITELIST = [
  "docs.google.com",
  "github.com",
  "localhost",
];

async function getWhitelist() {
  const result = await chrome.storage.local.get({
    whitelist: DEFAULT_WHITELIST,
  });
  return result.whitelist;
}

async function getMonitoringState() {
  const [allTabs, activeTabs, whitelist] = await Promise.all([
    chrome.tabs.query({}),
    chrome.tabs.query({ active: true, lastFocusedWindow: true }),
    getWhitelist(),
  ]);

  const appIsOpen = allTabs.some(function (tab) {
    return RootineDomain.isLocalHtmlUrl(tab.url || "");
  });

  if (!appIsOpen) {
    return {
      state: "paused",
      message: "Open your local Rootine .html file to start the focus check.",
    };
  }

  const activeUrl = activeTabs[0] ? activeTabs[0].url || "" : "";
  if (RootineDomain.isLocalHtmlUrl(activeUrl)) {
    return {
      state: "ready",
      message: "Rootine is open. Switch to a website when you are ready to focus.",
    };
  }

  const hostname = RootineDomain.hostnameFromUrl(activeUrl);
  if (!hostname) {
    return {
      state: "unsupported",
      message: "This is not a normal website, so Rootine is not checking it.",
    };
  }

  if (RootineDomain.isWhitelisted(hostname, whitelist)) {
    return {
      state: "growing",
      domain: hostname,
      message: "Your plant is growing — keep locking in!",
    };
  }

  return {
    state: "wilting",
    domain: hostname,
    message: "This domain is not whitelisted. Your plant will die if you stay here.",
  };
}

async function refreshBadge() {
  const current = await getMonitoringState();
  const badges = {
    paused: { text: "OFF", color: "#6b7280" },
    ready: { text: "ROOT", color: "#2f6f49" },
    unsupported: { text: "—", color: "#6b7280" },
    growing: { text: "GROW", color: "#2f6f49" },
    wilting: { text: "!", color: "#a63d2f" },
  };
  const badge = badges[current.state];
  await chrome.action.setBadgeBackgroundColor({ color: badge.color });
  await chrome.action.setBadgeText({ text: badge.text });
}

chrome.runtime.onMessage.addListener(function (request, _sender, sendResponse) {
  if (request.type !== "GET_STATE") return false;
  getMonitoringState()
    .then(sendResponse)
    .catch(function () {
      sendResponse({
        state: "error",
        message: "Rootine could not check this tab. Try reloading the extension.",
      });
    });
  return true;
});

chrome.tabs.onActivated.addListener(refreshBadge);
chrome.tabs.onRemoved.addListener(refreshBadge);
chrome.tabs.onUpdated.addListener(function (_tabId, changeInfo) {
  if (changeInfo.status || changeInfo.url) refreshBadge();
});
chrome.windows.onFocusChanged.addListener(refreshBadge);
chrome.storage.onChanged.addListener(refreshBadge);
chrome.runtime.onInstalled.addListener(refreshBadge);
chrome.runtime.onStartup.addListener(refreshBadge);
