const taskList = document.querySelector("#task-list");
const taskCount = document.querySelector("#task-count");
const taskProgressBar = document.querySelector("#task-progress-bar");
const taskProgressText = document.querySelector("#task-progress-text");
const completedStat = document.querySelector("#completed-stat");
const growthPercent = document.querySelector("#growth-percent");
const growthBar = document.querySelector("#growth-bar");
const growthTrack = document.querySelector("#growth-track");
const stageLabel = document.querySelector("#stage-label");
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
const focusNote = document.querySelector("#focus-note");
const toast = document.querySelector("#toast");

const stages = ["Seed", "Sprout", "Seedling", "Budding", "Bloom"];
let weeklyCompleted = 18;
let toastTimer;
let focusTimer;
let secondsRemaining = 25 * 60;
let focusIsRunning = false;

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

function getTaskState() {
  const tasks = [...taskList.querySelectorAll(".task-item")];
  const completed = tasks.filter((task) => task.querySelector("input").checked).length;
  return { tasks, completed, total: tasks.length };
}

function updateDashboard(previouslyCompleted) {
  const { tasks, completed, total } = getTaskState();
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const stageIndex = Math.min(4, Math.floor(percent / 25));

  tasks.forEach((task) => {
    task.classList.toggle("is-complete", task.querySelector("input").checked);
  });

  taskCount.textContent = `${completed} / ${total}`;
  taskProgressBar.style.width = `${percent}%`;
  taskProgressText.textContent = `${completed} of ${total} tasks complete`;
  growthPercent.textContent = `${percent}%`;
  growthBar.style.width = `${percent}%`;
  growthTrack.setAttribute("aria-valuenow", String(percent));
  stageLabel.textContent = stages[stageIndex];
  plantScene.className = `plant-scene growth-${stageIndex}`;

  const remaining = total - completed;
  if (total === 0) {
    plantMessage.textContent = "Add a task when you’re ready to begin growing.";
  } else if (remaining === 0) {
    plantMessage.textContent = "Clover is thriving. You finished today’s plan.";
  } else {
    plantMessage.textContent = `${remaining} more ${remaining === 1 ? "task" : "tasks"} will help Clover grow today.`;
  }

  if (typeof previouslyCompleted === "number" && completed > previouslyCompleted) {
    weeklyCompleted += completed - previouslyCompleted;
    completedStat.textContent = String(weeklyCompleted);
  }
}

function buildTask(name) {
  const item = document.createElement("li");
  item.className = "task-item";

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
  const { completed } = getTaskState();
  const previouslyCompleted = completed + (event.target.checked ? -1 : 1);
  updateDashboard(previouslyCompleted);

  if (event.target.checked) {
    showToast("Task complete — Clover grew a little.");
  }
});

taskList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-task");
  if (!removeButton) return;

  const item = removeButton.closest(".task-item");
  const name = item.querySelector(".task-name").textContent;
  item.remove();
  updateDashboard();
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
  updateDashboard();
  showToast("Task added to today’s plan.");
  newTaskInput.focus();
});

function formatFocusTime() {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderFocusState() {
  const buttonCopy = focusIsRunning ? "Pause session" : secondsRemaining < 25 * 60 ? "Continue session" : "Begin focus session";
  focusTime.textContent = formatFocusTime();
  focusCardButton.textContent = buttonCopy;
  focusLabel.textContent = focusIsRunning ? formatFocusTime() : "Start focus";
  focusNote.textContent = focusIsRunning
    ? "You’re in focus mode. Keep this tab open and take it one task at a time."
    : "One quiet session for your most important task.";
}

function toggleFocusTimer() {
  focusIsRunning = !focusIsRunning;
  window.clearInterval(focusTimer);

  if (focusIsRunning) {
    focusTimer = window.setInterval(() => {
      secondsRemaining -= 1;
      if (secondsRemaining <= 0) {
        secondsRemaining = 0;
        focusIsRunning = false;
        window.clearInterval(focusTimer);
        showToast("Focus session complete. Take a short break.");
      }
      renderFocusState();
    }, 1000);
  }

  renderFocusState();
}

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

updateDashboard();
renderFocusState();
