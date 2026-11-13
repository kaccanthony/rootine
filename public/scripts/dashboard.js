const taskList = document.querySelector("#task-list");
const taskCount = document.querySelector("#task-count");
const taskProgressBar = document.querySelector("#task-progress-bar");
const taskProgressText = document.querySelector("#task-progress-text");
const completedStat = document.querySelector("#completed-stat");
const growthPercent = document.querySelector("#growth-percent");
const growthBar = document.querySelector("#growth-bar");
const growthTrack = document.querySelector("#growth-track");
const stageLabel = document.querySelector("#stage-label");
const plantPanel = document.querySelector("#plant");
const plantScene = document.querySelector("#plant-scene");
const plantMessage = document.querySelector("#plant-message");
const addTaskForm = document.querySelector("#add-task-form");
const newTaskInput = document.querySelector("#new-task");
const todayLabel = document.querySelector("#today-label");
const welcomeTitle = document.querySelector("#welcome-title");
const focusButton = document.querySelector("#focus-button");
const focusCardButton = document.querySelector("#focus-card-button");
const focusLabel = document.querySelector("#focus-label");
const focusTime = document.querySelector("#focus-time");
const timerRingProgress = document.querySelector("#timer-ring-progress");
const roundCount = document.querySelector("#round-count");
const roundDots = [...document.querySelectorAll(".round-dot")];
const healthStatus = document.querySelector("#health-status");
const riskPercent = document.querySelector("#risk-percent");
const riskTrack = document.querySelector("#risk-track");
const riskBar = document.querySelector("#risk-bar");
const riskNote = document.querySelector("#risk-note");
const replantButton = document.querySelector("#replant-button");
const toast = document.querySelector("#toast");

const GROWTH_STORAGE_KEY = "rootine-growth-v1";
const FOCUS_DURATION_SECONDS = 25 * 60;
const TIMER_RING_LENGTH = 930;
const ROOTINE_PAGE_SOURCE = "rootine-dashboard";
const ROOTINE_EXTENSION_SOURCE = "rootine-extension";
const stages = ["Seed", "Sprout", "Seedling", "Budding", "Bloom"];

let weeklyCompleted = 18;
let toastTimer;
let focusTimer;
let secondsRemaining = FOCUS_DURATION_SECONDS;
let focusIsRunning = false;
let completedRounds = 0;
let plantIsDead = false;
let currentExtensionState = null;
let lastRiskDeadlineRefreshAt = 0;

function manilaDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date());
}

function defaultGrowthState() {
  return {
    growthPercent: 3,
    completedToday: 3,
    lastCompletionDate: manilaDateKey(),
    awardedTaskIds: ["starter-1", "starter-2", "starter-3"],
  };
}

function loadGrowthState() {
  try {
    const saved = JSON.parse(localStorage.getItem(GROWTH_STORAGE_KEY));
    if (!saved || typeof saved !== "object") return defaultGrowthState();

    return {
      growthPercent: Math.min(100, Math.max(0, Number(saved.growthPercent) || 0)),
      completedToday:
        saved.lastCompletionDate === manilaDateKey()
          ? Math.max(0, Number(saved.completedToday) || 0)
          : 0,
      lastCompletionDate: saved.lastCompletionDate || null,
      awardedTaskIds: Array.isArray(saved.awardedTaskIds)
        ? saved.awardedTaskIds.slice(-500)
        : [],
    };
  } catch (_error) {
    return defaultGrowthState();
  }
}

let growthState = loadGrowthState();

function saveGrowthState() {
  localStorage.setItem(GROWTH_STORAGE_KEY, JSON.stringify(growthState));
}

todayLabel.textContent = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Manila",
}).format(new Date());

const manilaHour = Number(
  new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: "Asia/Manila",
  }).format(new Date()),
);
const greeting = manilaHour < 12 ? "morning" : manilaHour < 18 ? "afternoon" : "evening";
welcomeTitle.textContent = `Good ${greeting}, Kent.`;

function initializeTaskIds() {
  [...taskList.querySelectorAll(".task-item")].forEach((task, index) => {
    task.dataset.taskId = `starter-${index + 1}`;
  });
}

function getTaskState() {
  const tasks = [...taskList.querySelectorAll(".task-item")];
  const completed = tasks.filter((task) => task.querySelector("input").checked).length;
  return { tasks, completed, total: tasks.length };
}

function getStageIndex(percent) {
  if (percent === 0) return 0;
  if (percent < 10) return 1;
  if (percent < 35) return 2;
  if (percent < 70) return 3;
  return 4;
}

function renderGrowth() {
  const percent = growthState.growthPercent;
  const stageIndex = getStageIndex(percent);
  growthPercent.textContent = `${percent}%`;
  growthBar.style.width = `${percent}%`;
  growthTrack.setAttribute("aria-valuenow", String(percent));
  stageLabel.textContent = plantIsDead ? "Plant lost" : stages[stageIndex];
  plantScene.className = `plant-scene growth-${stageIndex}`;
  plantScene.style.setProperty("--growth-rise", `${Math.min(35, percent * 0.35)}px`);

  if (plantIsDead) {
    plantMessage.textContent = "Clover cannot grow again until you start a new seed.";
  } else if (growthState.completedToday > 0) {
    plantMessage.textContent = `+${growthState.completedToday}% today · each completed task adds 1% growth.`;
  } else {
    plantMessage.textContent = "Stagnant today · complete one task to add 1% growth.";
  }
}

function updateTaskProgress() {
  const { tasks, completed, total } = getTaskState();
  const taskPercent = total ? Math.round((completed / total) * 100) : 0;

  tasks.forEach((task) => {
    task.classList.toggle("is-complete", task.querySelector("input").checked);
  });

  taskCount.textContent = `${completed} / ${total}`;
  taskProgressBar.style.width = `${taskPercent}%`;
  taskProgressText.textContent = `${completed} of ${total} tasks complete`;
  renderGrowth();
}

function awardTaskGrowth(task) {
  const taskId = task.dataset.taskId;
  if (!taskId || plantIsDead || growthState.awardedTaskIds.includes(taskId)) return false;

  const today = manilaDateKey();
  growthState.completedToday =
    growthState.lastCompletionDate === today ? growthState.completedToday + 1 : 1;
  growthState.lastCompletionDate = today;
  growthState.growthPercent = Math.min(100, growthState.growthPercent + 1);
  growthState.awardedTaskIds.push(taskId);
  growthState.awardedTaskIds = growthState.awardedTaskIds.slice(-500);
  saveGrowthState();
  return true;
}

function buildTask(name) {
  const item = document.createElement("li");
  item.className = "task-item";
  item.dataset.taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";

  const customCheck = document.createElement("span");
  customCheck.className = "custom-check";
  customCheck.setAttribute("aria-hidden", "true");

  const copy = document.createElement("span");
  copy.className = "task-copy";

  const taskName = document.createElement("span");
  taskName.className = "task-name";
  taskName.textContent = name;

  const taskMeta = document.createElement("span");
  taskMeta.className = "task-meta";
  taskMeta.textContent = "New task · Today";

  const removeButton = document.createElement("button");
  removeButton.className = "remove-task";
  removeButton.type = "button";
  removeButton.setAttribute("aria-label", `Remove ${name}`);
  removeButton.textContent = "×";

  copy.append(taskName, taskMeta);
  label.append(checkbox, customCheck, copy);
  item.append(label, removeButton);
  return item;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

taskList.addEventListener("change", (event) => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  const task = event.target.closest(".task-item");
  const grew = event.target.checked && awardTaskGrowth(task);
  updateTaskProgress();

  if (grew) {
    weeklyCompleted += 1;
    completedStat.textContent = String(weeklyCompleted);
    showToast("Task complete — Clover grew by 1%.");
  } else if (event.target.checked && plantIsDead) {
    showToast("Start a new seed before Clover can grow again.");
  }
});

taskList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-task");
  if (!removeButton) return;

  const item = removeButton.closest(".task-item");
  const name = item.querySelector(".task-name").textContent;
  item.remove();
  updateTaskProgress();
  showToast(`Removed “${name}”.`);
});

addTaskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = newTaskInput.value.trim();
  if (!name) {
    newTaskInput.focus();
    return;
  }

  taskList.append(buildTask(name));
  newTaskInput.value = "";
  updateTaskProgress();
  showToast("Task added to today’s plan.");
  newTaskInput.focus();
});

function formatFocusTime() {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderFocusState() {
  const buttonCopy = focusIsRunning
    ? "Pause session"
    : secondsRemaining < FOCUS_DURATION_SECONDS
      ? "Continue session"
      : "Begin focus session";
  const elapsedRatio = 1 - secondsRemaining / FOCUS_DURATION_SECONDS;

  focusTime.textContent = formatFocusTime();
  focusCardButton.textContent = buttonCopy;
  focusLabel.textContent = focusIsRunning ? formatFocusTime() : "Start focus";
  timerRingProgress.style.strokeDashoffset = String(TIMER_RING_LENGTH * elapsedRatio);
  roundCount.textContent = String(completedRounds);
  roundDots.forEach((dot, index) => {
    dot.classList.toggle("is-complete", index < completedRounds);
    dot.classList.toggle("is-active", index === completedRounds && completedRounds < 4);
  });
}

function completeFocusRound() {
  completedRounds = Math.min(4, completedRounds + 1);
  focusIsRunning = false;
  secondsRemaining = FOCUS_DURATION_SECONDS;
  window.clearInterval(focusTimer);
  showToast("Focus round complete. Take a short break.");
}

function toggleFocusTimer() {
  focusIsRunning = !focusIsRunning;
  window.clearInterval(focusTimer);

  if (focusIsRunning) {
    focusTimer = window.setInterval(() => {
      secondsRemaining -= 1;
      if (secondsRemaining <= 0) completeFocusRound();
      renderFocusState();
    }, 1000);
  }

  renderFocusState();
}

function renderExtensionHealth(current) {
  currentExtensionState = current;
  const health = current?.health || { riskPercent: 0, isDead: false, riskEvents: 0 };
  const risk = health.riskPercent || 0;
  plantIsDead = Boolean(health.isDead);
  plantPanel.classList.toggle("is-dead", plantIsDead);
  riskPercent.textContent = `${risk}%`;
  riskBar.style.width = `${risk}%`;
  riskTrack.setAttribute("aria-valuenow", String(risk));
  replantButton.hidden = !plantIsDead;
  healthStatus.className = "health-status";

  if (plantIsDead) {
    healthStatus.textContent = "Plant lost";
    healthStatus.classList.add("is-risk");
    riskNote.textContent = "The last distraction roll was fatal. Start a new seed to reset risk.";
  } else if (current.state === "wilting") {
    healthStatus.textContent = "At risk";
    healthStatus.classList.add("is-risk");
    renderRiskCountdown(current);
  } else {
    healthStatus.textContent = current.state === "growing" ? "Focused" : "Safe";
    healthStatus.classList.add("is-safe");
    riskNote.textContent =
      health.riskEvents > 0
        ? `${health.riskEvents} distraction ${health.riskEvents === 1 ? "interval" : "intervals"} recorded.`
        : "No 30-minute death roll recorded.";
  }

  renderGrowth();
}

function formatRiskCountdown(deadline) {
  const totalSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderRiskCountdown(current) {
  riskNote.textContent = `${formatRiskCountdown(current.nextRiskAt)} left until +1% risk\n${formatRiskCountdown(current.nextRollAt)} left until the death roll`;
}

function updateLiveRiskCountdown() {
  if (currentExtensionState?.state !== "wilting") return;
  renderRiskCountdown(currentExtensionState);

  if (
    currentExtensionState.nextRiskAt <= Date.now() &&
    Date.now() - lastRiskDeadlineRefreshAt > 1000
  ) {
    lastRiskDeadlineRefreshAt = Date.now();
    requestExtensionState();
  }
}

function requestExtensionState() {
  window.postMessage(
    { source: ROOTINE_PAGE_SOURCE, type: "GET_FOCUS_STATE" },
    window.location.origin,
  );
}

window.addEventListener("message", (event) => {
  if (
    event.source !== window ||
    event.origin !== window.location.origin ||
    event.data?.source !== ROOTINE_EXTENSION_SOURCE
  ) {
    return;
  }

  if (event.data.type === "FOCUS_STATE") renderExtensionHealth(event.data.state);
});

replantButton.addEventListener("click", () => {
  window.postMessage(
    { source: ROOTINE_PAGE_SOURCE, type: "REPLANT" },
    window.location.origin,
  );
});

focusButton.addEventListener("click", toggleFocusTimer);
focusCardButton.addEventListener("click", toggleFocusTimer);

document.querySelectorAll(".future-link").forEach((button) => {
  button.addEventListener("click", () => {
    showToast(`${button.dataset.future} is planned for the next build phase.`);
  });
});

document.querySelector(".profile-button").addEventListener("click", () => {
  showToast("Profile settings are not part of this dashboard build yet.");
});

initializeTaskIds();
updateTaskProgress();
renderFocusState();
requestExtensionState();
window.setInterval(requestExtensionState, 60 * 1000);
window.setInterval(updateLiveRiskCountdown, 1000);
