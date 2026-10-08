const STORAGE = {
    todos: "focusboard_todos",
    planner: "focusboard_planner",
    goals: "focusboard_goals",
    theme: "focusboard_theme"
};

const state = {
    todos: load(STORAGE.todos, []),
    planner: load(STORAGE.planner, {}),
    goals: load(STORAGE.goals, []),
    theme: localStorage.getItem(STORAGE.theme) || "light",
    activeFeature: null
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const dashboardView = $("#dashboardView");
const featureView = $("#featureView");
const featureBody = $("#featureBody");
const featureTitle = $("#featureTitle");
const featureEyebrow = $("#featureEyebrow");

function load(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
}

function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    $("#themeIcon").textContent = state.theme === "dark" ? "☀" : "☾";
    $("#themeLabel").textContent = state.theme === "dark" ? "Light" : "Dark";
}

$("#themeToggle").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE.theme, state.theme);
    applyTheme();
});

$("#homeBtn").addEventListener("click", showDashboard);
$("#backBtn").addEventListener("click", showDashboard);

const featureMeta = {
    todo: ["TASKS", "Todo List"],
    planner: ["PLAN", "Daily Planner"],
    pomodoro: ["FOCUS", "Pomodoro Timer"],
    quote: ["MOTIVATION", "Daily Quote"],
    goals: ["TODAY", "Daily Goals"],
    weather: ["WEATHER", "Weather"]
};

$$("[data-feature]").forEach(card => {
    card.addEventListener("click", () => openFeature(card.dataset.feature));
});

function openFeature(name) {
    const template = document.getElementById(`${name}Template`);
    if (!template) return;

    state.activeFeature = name;
    dashboardView.classList.add("hidden");
    featureView.classList.remove("hidden");
    featureEyebrow.textContent = featureMeta[name][0];
    featureTitle.textContent = featureMeta[name][1];
    featureBody.innerHTML = "";
    featureBody.appendChild(template.content.cloneNode(true));

    if (name === "todo") initTodo();
    if (name === "planner") initPlanner();
    if (name === "pomodoro") initPomodoro();
    if (name === "quote") initQuote();
    if (name === "goals") initGoals();
    if (name === "weather") initWeatherDetail();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showDashboard() {
    state.activeFeature = null;
    featureView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    updateSummaries();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* Todo */
function initTodo() {
    const input = $("#todoInput");
    $("#addTodoBtn").addEventListener("click", () => addTodo(input));
    input.addEventListener("keydown", e => { if (e.key === "Enter") addTodo(input); });
    $("#clearCompletedBtn").addEventListener("click", () => {
        state.todos = state.todos.filter(todo => !todo.completed);
        save(STORAGE.todos, state.todos);
        renderTodos();
    });
    $("#todoList").addEventListener("click", handleTodoAction);
    renderTodos();
}

function addTodo(input) {
    const text = input.value.trim();
    if (!text) return;
    state.todos.push({ id: crypto.randomUUID(), text, completed: false, important: false });
    save(STORAGE.todos, state.todos);
    input.value = "";
    renderTodos();
    updateSummaries();
}

function handleTodoAction(e) {
    const button = e.target.closest("[data-action]");
    if (!button) return;
    const item = button.closest("[data-id]");
    const id = item?.dataset.id;
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;

    if (button.dataset.action === "complete") todo.completed = !todo.completed;
    if (button.dataset.action === "important") todo.important = !todo.important;
    if (button.dataset.action === "delete") state.todos = state.todos.filter(t => t.id !== id);

    save(STORAGE.todos, state.todos);
    renderTodos();
    updateSummaries();
}

function renderTodos() {
    const list = $("#todoList");
    if (!list) return;
    const pending = state.todos.filter(t => !t.completed).length;
    const important = state.todos.filter(t => t.important && !t.completed).length;
    $("#todoCount").textContent = `${state.todos.length} task${state.todos.length === 1 ? "" : "s"}`;
    $("#todoImportantCount").textContent = important;

    if (!state.todos.length) {
        list.innerHTML = '<div class="empty-state">No tasks yet. Add the first thing you want to finish.</div>';
        return;
    }

    list.innerHTML = state.todos.map(todo => `
    <div class="list-item ${todo.completed ? "completed" : ""}" data-id="${todo.id}">
      <button class="check-btn" data-action="complete" type="button" aria-label="Complete task">${todo.completed ? "✓" : ""}</button>
      <span class="item-text">${escapeHTML(todo.text)}</span>
      <button class="icon-btn ${todo.important ? "important" : ""}" data-action="important" type="button" aria-label="Mark important">${todo.important ? "★" : "☆"}</button>
      <button class="icon-btn" data-action="delete" type="button" aria-label="Delete task">×</button>
    </div>
  `).join("");
}

/* Planner */
function initPlanner() {
    const plannerList = $("#plannerList");
    const hours = Array.from({ length: 15 }, (_, index) => index + 7);
    plannerList.innerHTML = hours.map(hour => {
        const label = formatHour(hour);
        return `
      <div class="plan-row ${new Date().getHours() === hour ? "current" : ""}" data-hour="${hour}">
        <div class="plan-time">${label}</div>
        <input class="plan-input" data-hour="${hour}" value="${escapeHTML(state.planner[hour] || "")}" placeholder="Add a plan...">
      </div>
    `;
    }).join("");

    $$(".plan-input", plannerList).forEach(input => {
        input.addEventListener("input", e => {
            state.planner[e.target.dataset.hour] = e.target.value;
            if (!e.target.value.trim()) delete state.planner[e.target.dataset.hour];
            save(STORAGE.planner, state.planner);
            updateSummaries();
        });
    });
}

function formatHour(hour) {
    const suffix = hour >= 12 ? "PM" : "AM";
    const display = hour % 12 || 12;
    return `${display}:00 ${suffix}`;
}

/* Pomodoro */
let timerInterval = null;
let remainingSeconds = 25 * 60;
let timerRunning = false;

function initPomodoro() {
    renderTimer();
    $("#startTimerBtn").addEventListener("click", startTimer);
    $("#pauseTimerBtn").addEventListener("click", pauseTimer);
    $("#resetTimerBtn").addEventListener("click", resetTimer);
}

function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    $("#timerStatus").textContent = "Focus mode is running.";
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        remainingSeconds--;
        renderTimer();
        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            timerRunning = false;
            remainingSeconds = 25 * 60;
            $("#timerStatus").textContent = "Session complete. Take a short break.";
            try { new AudioContext(); } catch { }
            alert("Pomodoro complete — take a short break!");
            renderTimer();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    $("#timerStatus").textContent = "Paused. Pick it up when you're ready.";
}

function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    remainingSeconds = 25 * 60;
    if ($("#timerStatus")) $("#timerStatus").textContent = "Ready when you are.";
    renderTimer();
}

function renderTimer() {
    const display = $("#timerDisplay");
    if (!display) return;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    display.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/* Quote */
const fallbackQuotes = [
    ["The secret of getting ahead is getting started.", "Mark Twain"],
    ["You do not have to be great to start, but you have to start to be great.", "Zig Ziglar"],
    ["Action is the foundational key to all success.", "Pablo Picasso"],
    ["Small steps every day add up to big results.", "Unknown"]
];

async function initQuote() {
    $("#newQuoteBtn").addEventListener("click", fetchQuote);
    await fetchQuote();
}

async function fetchQuote() {
    const text = $("#quoteText");
    const author = $("#quoteAuthor");
    const button = $("#newQuoteBtn");
    text.textContent = "Finding a thought worth keeping...";
    author.textContent = "—";
    button.disabled = true;

    try {
        const response = await fetch("https://dummyjson.com/quotes/random");
        if (!response.ok) throw new Error("Quote API unavailable");
        const data = await response.json();
        text.textContent = data.quote;
        author.textContent = `— ${data.author}`;
    } catch {
        const quote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        text.textContent = quote[0];
        author.textContent = `— ${quote[1]} (offline fallback)`;
    } finally {
        button.disabled = false;
    }
}

/* Goals */
function initGoals() {
    const input = $("#goalInput");
    $("#addGoalBtn").addEventListener("click", () => addGoal(input));
    input.addEventListener("keydown", e => { if (e.key === "Enter") addGoal(input); });
    $("#goalList").addEventListener("click", handleGoalAction);
    renderGoals();
}

function addGoal(input) {
    const text = input.value.trim();
    if (!text) return;
    state.goals.push({ id: crypto.randomUUID(), text, completed: false });
    save(STORAGE.goals, state.goals);
    input.value = "";
    renderGoals();
    updateSummaries();
}

function handleGoalAction(e) {
    const button = e.target.closest("[data-action]");
    if (!button) return;
    const item = button.closest("[data-id]");
    const id = item?.dataset.id;
    if (!id) return;

    if (button.dataset.action === "complete") {
        const goal = state.goals.find(g => g.id === id);
        if (goal) goal.completed = !goal.completed;
    }
    if (button.dataset.action === "delete") {
        state.goals = state.goals.filter(g => g.id !== id);
    }

    save(STORAGE.goals, state.goals);
    renderGoals();
    updateSummaries();
}

function renderGoals() {
    const list = $("#goalList");
    if (!list) return;

    const complete = state.goals.filter(g => g.completed).length;
    const total = state.goals.length;
    const percent = total ? Math.round((complete / total) * 100) : 0;
    $("#goalProgressText").textContent = `${complete} of ${total} completed`;
    $("#goalProgressBar").style.width = `${percent}%`;

    list.innerHTML = total ? state.goals.map(goal => `
    <div class="list-item goal-item ${goal.completed ? "completed" : ""}" data-id="${goal.id}">
      <button class="check-btn" data-action="complete" type="button" aria-label="Complete goal">${goal.completed ? "✓" : ""}</button>
      <span class="item-text">${escapeHTML(goal.text)}</span>
      <button class="icon-btn" data-action="delete" type="button" aria-label="Delete goal">×</button>
    </div>
  `).join("") : '<div class="empty-state">Set a few small goals. Progress becomes visible fast.</div>';
}

/* Weather */
let weatherCache = null;

async function getWeather() {
    const fallback = {
        location: "Your location",
        temperature: "--",
        condition: "Weather unavailable",
        humidity: "--",
        wind: "--",
        rain: "--",
        icon: "☁"
    };

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 7000,
                maximumAge: 600000
            });
        });

        const { latitude, longitude } = position.coords;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Weather request failed");
        const data = await response.json();

        const current = data.current;
        const condition = weatherDescription(current.weather_code);
        weatherCache = {
            location: "Current location",
            temperature: Math.round(current.temperature_2m),
            condition,
            humidity: Math.round(current.relative_humidity_2m),
            wind: Math.round(current.wind_speed_10m),
            rain: Number(current.precipitation || 0).toFixed(1),
            icon: weatherIcon(current.weather_code)
        };
        return weatherCache;
    } catch {
        return fallback;
    }
}

function weatherDescription(code) {
    if (code === 0) return "Clear sky";
    if ([1, 2, 3].includes(code)) return "Partly cloudy";
    if ([45, 48].includes(code)) return "Foggy";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
    if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
    if ([71, 73, 75, 77].includes(code)) return "Snow";
    if ([80, 81, 82].includes(code)) return "Rain showers";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "Mixed conditions";
}

function weatherIcon(code) {
    if (code === 0) return "☀";
    if ([1, 2].includes(code)) return "⛅";
    if ([3, 45, 48].includes(code)) return "☁";
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "☂";
    if ([71, 73, 75, 77].includes(code)) return "❄";
    if ([95, 96, 99].includes(code)) return "⚡";
    return "☁";
}

function applyWeather(data) {
    $("#weatherIcon").textContent = data.icon;
    $("#weatherLocation").textContent = data.location;
    $("#weatherTemp").textContent = data.temperature === "--" ? "--°" : `${data.temperature}°`;
    $("#weatherCondition").textContent = data.condition;
    $("#weatherPanelTemp").textContent = data.temperature === "--" ? "--°" : `${data.temperature}°`;
    $("#weatherPanelDetails").textContent = `${data.condition} · ${data.humidity}% humidity`;
}

async function loadWeather() {
    const data = await getWeather();
    applyWeather(data);
}

async function initWeatherDetail() {
    const data = weatherCache || await getWeather();
    $("#detailWeatherIcon").textContent = data.icon;
    $("#detailWeatherLocation").textContent = data.location;
    $("#detailWeatherTemp").textContent = data.temperature === "--" ? "--°" : `${data.temperature}°`;
    $("#detailWeatherCondition").textContent = data.condition;
    $("#weatherHumidity").textContent = data.humidity === "--" ? "--%" : `${data.humidity}%`;
    $("#weatherWind").textContent = data.wind === "--" ? "-- km/h" : `${data.wind} km/h`;
    $("#weatherRain").textContent = data.rain === "--" ? "-- mm" : `${data.rain} mm`;
}

/* Date/time + dynamic background */
let clockInterval = null;
function updateDateTime() {
    const now = new Date();
    $("#currentTime").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    $("#currentDate").textContent = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short", year: "numeric" });

    const hour = now.getHours();
    $("#greeting").textContent =
        hour < 12 ? "GOOD MORNING" :
            hour < 17 ? "GOOD AFTERNOON" :
                hour < 21 ? "GOOD EVENING" : "GOOD NIGHT";

    applyTimeBackground(hour);

    if (state.activeFeature === "planner") {
        $$(".plan-row").forEach(row => row.classList.toggle("current", Number(row.dataset.hour) === hour));
    }
}

function applyTimeBackground(hour) {
    const app = $(".app-shell");
    let tone = "#f4f1ea";
    if (state.theme === "dark") tone = "#171816";
    else if (hour >= 5 && hour < 11) tone = "#f4efe2";
    else if (hour >= 11 && hour < 17) tone = "#f1f3ed";
    else if (hour >= 17 && hour < 21) tone = "#f2e9dd";
    else tone = "#e9ece8";
    app.style.backgroundColor = tone;
}

function updateSummaries() {
    const pending = state.todos.filter(t => !t.completed).length;
    const completedGoals = state.goals.filter(g => g.completed).length;
    const totalGoals = state.goals.length;
    const progress = totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0;
    const plans = Object.values(state.planner).filter(Boolean).length;

    $("#todoSummary").textContent = `${pending} pending task${pending === 1 ? "" : "s"}`;
    $("#goalSummary").textContent = `${completedGoals} of ${totalGoals} completed`;
    $("#quickTodoCount").textContent = pending;
    $("#quickGoalProgress").textContent = `${progress}%`;
    $("#quickPlanCount").textContent = plans;
}

applyTheme();
updateSummaries();
updateDateTime();
clockInterval = setInterval(updateDateTime, 1000);
loadWeather();
