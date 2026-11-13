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
const domainForm = document.getElementById("domain-form");
const domainInput = document.getElementById("domain-input");
const domainList = document.getElementById("domain-list");
const formError = document.getElementById("form-error");

const statePresentation = {
  paused: { heading: "Focus check paused", icon: "🪴" },
  ready: { heading: "Your focus anchor is open", icon: "🌱" },
  unsupported: { heading: "Nothing to check here", icon: "🪴" },
  growing: { heading: "Your plant is growing", icon: "🌿" },
  wilting: { heading: "Your plant is wilting", icon: "🥀" },
  error: { heading: "Check unavailable", icon: "🪴" },
};

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
    removeButton.textContent = domain + " ×";
    removeButton.setAttribute("aria-label", "Remove " + domain);
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

async function renderState() {
  const current = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  const presentation = statePresentation[current.state] || statePresentation.error;
  plantCard.dataset.state = current.state;
  plant.textContent = presentation.icon;
  statusHeading.textContent = presentation.heading;
  statusMessage.textContent = current.message;

  if (current.domain) {
    checkedDomain.textContent = "Checking domain: " + current.domain;
    checkedDomain.hidden = false;
  } else {
    checkedDomain.hidden = true;
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

Promise.all([renderWhitelist(), renderState()]).catch(function () {
  plantCard.dataset.state = "error";
  plant.textContent = "🪴";
  statusHeading.textContent = "Check unavailable";
  statusMessage.textContent = "Reload the extension and try again.";
});
