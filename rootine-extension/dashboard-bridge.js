const ROOTINE_PAGE_SOURCE = "rootine-dashboard";
const ROOTINE_EXTENSION_SOURCE = "rootine-extension";

async function sendHealthState() {
  try {
    const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    window.postMessage(
      { source: ROOTINE_EXTENSION_SOURCE, type: "FOCUS_STATE", state },
      window.location.origin,
    );
  } catch (_error) {
    window.postMessage(
      { source: ROOTINE_EXTENSION_SOURCE, type: "FOCUS_STATE_UNAVAILABLE" },
      window.location.origin,
    );
  }
}

window.addEventListener("message", async function (event) {
  if (event.source !== window || event.data?.source !== ROOTINE_PAGE_SOURCE) return;

  if (event.data.type === "GET_FOCUS_STATE") {
    await sendHealthState();
  }

  if (event.data.type === "REPLANT") {
    await chrome.runtime.sendMessage({ type: "RESET_PLANT" });
    await sendHealthState();
  }
});

chrome.storage.onChanged.addListener(function (changes, areaName) {
  if (areaName === "local" && (changes.plantHealth || changes.whitelist)) {
    sendHealthState();
  }
});

sendHealthState();
