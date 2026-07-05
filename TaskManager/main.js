let tasks = [];
let appSettings = {
    darkMode: false
};
let taskChart = null;
let currentFilter = "all";

const navDashboard = document.getElementById("nav-dashboard");
const navSettings = document.getElementById("nav-settings");
const dashboardView = document.getElementById("dashboard-view");
const settingsView = document.getElementById("settings-view");

const openModalBtn = document.getElementById("open-modal-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const taskModal = document.getElementById("task-modal");
const taskForm = document.getElementById("task-form");
const modalTitle = document.getElementById("modal-title");
const submitFormBtn = document.getElementById("submit-form-btn");
const editTaskIdField = document.getElementById("edit-task-id");

const totalTasksEl = document.getElementById("total-tasks-count");
const completedTasksEl = document.getElementById("completed-tasks-count");
const pendingTasksEl = document.getElementById("pending-tasks-count");
const taskListUl = document.getElementById("task-list-ul");
const filterButtons = document.querySelectorAll(".filter-btn");

const darkModeToggle = document.getElementById("dark-mode-toggle");
const resetDataBtn = document.getElementById("reset-data-btn");

document.addEventListener("DOMContentLoaded", () => {
    loadFromStorage();
    applyTheme();
    updateUI();
});

navDashboard.addEventListener("click", () => switchView("dashboard"));
navSettings.addEventListener("click", () => switchView("settings"));

openModalBtn.addEventListener("click", () => {
    modalTitle.textContent = "New Task Entry";
    submitFormBtn.textContent = "Add Task";
    editTaskIdField.value = "";
    taskForm.reset();
    taskModal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => taskModal.classList.add("hidden"));
taskModal.addEventListener("click", (e) => {
    if (e.target === taskModal) taskModal.classList.add("hidden");
});

taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const titleInput = document.getElementById("task-title-input");
    const categorySelect = document.getElementById("task-category-select");
    
    const titleValueProperty = titleInput.value.trim();
    const categoryValueProperty = categorySelect.value;
    const editId = editTaskIdField.value;

    if (editId) {
        tasks = tasks.map(t => {
            if (t.id === parseInt(editId)) {
                t.title = titleValueProperty;
                t.category = categoryValueProperty;
            }
            return t;
        });
    } else {
        const newTask = {
            id: Date.now(),
            title: titleValueProperty,
            category: categoryValueProperty,
            status: "pending"
        };
        tasks.unshift(newTask);
    }

    saveToStorage();
    updateUI();
    taskForm.reset();
    taskModal.classList.add("hidden");
});

taskListUl.addEventListener("click", (e) => {
    const completeButton = e.target.closest(".action-btn.complete");
    const editButton = e.target.closest(".action-btn.edit");
    const deleteButton = e.target.closest(".action-btn.delete");

    if (completeButton) {
        const li = completeButton.closest(".transaction-item");
        const id = parseInt(li.getAttribute("data-id"));
        
        tasks = tasks.map(t => {
            if (t.id === id) {
                t.status = t.status === "pending" ? "completed" : "pending";
            }
            return t;
        });
        saveToStorage();
        updateUI();
    }

    if (editButton) {
        const li = editButton.closest(".transaction-item");
        const id = parseInt(li.getAttribute("data-id"));
        const taskToEdit = tasks.find(t => t.id === id);
        
        if (taskToEdit) {
            modalTitle.textContent = "Modify Task Details";
            submitFormBtn.textContent = "Save Changes";
            editTaskIdField.value = taskToEdit.id;
            document.getElementById("task-title-input").value = taskToEdit.title;
            document.getElementById("task-category-select").value = taskToEdit.category;
            taskModal.classList.remove("hidden");
        }
    }

    if (deleteButton) {
        const li = deleteButton.closest(".transaction-item");
        const id = parseInt(li.getAttribute("data-id"));
        tasks = tasks.filter(t => t.id !== id);
        saveToStorage();
        updateUI();
    }
});

filterButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
        filterButtons.forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        currentFilter = e.target.getAttribute("data-filter");
        renderTaskList();
    });
});

darkModeToggle.addEventListener("click", () => {
    appSettings.darkMode = !appSettings.darkMode;
    saveToStorage();
    applyTheme();
    renderChart();
});

resetDataBtn.addEventListener("click", () => {
    if (confirm("Reset everything? All records will be erased.")) {
        localStorage.clear();
        tasks = [];
        appSettings = { darkMode: false };
        applyTheme();
        updateUI();
        switchView("dashboard");
    }
});

function switchView(viewName) {
    if (viewName === "dashboard") {
        navDashboard.classList.add("link-active");
        navSettings.classList.remove("link-active");
        dashboardView.classList.remove("hidden");
        settingsView.classList.add("hidden");
        renderChart();
    } else if (viewName === "settings") {
        navSettings.classList.add("link-active");
        navDashboard.classList.remove("link-active");
        settingsView.classList.remove("hidden");
        dashboardView.classList.add("hidden");
    }
}

function applyTheme() {
    if (appSettings.darkMode) {
        document.body.classList.add("dark-theme");
    } else {
        document.body.classList.remove("dark-theme");
    }
}

function updateUI() {
    calculateMetrics();
    renderTaskList();
    renderChart();
}

function calculateMetrics() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const pending = total - completed;

    totalTasksEl.textContent = total;
    completedTasksEl.textContent = completed;
    pendingTasksEl.textContent = pending;
}

function renderTaskList() {
    taskListUl.innerHTML = "";

    const filtered = tasks.filter(t => {
        if (currentFilter === "all") return true;
        return t.status === currentFilter;
    });

    if (filtered.length === 0) {
        taskListUl.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 2rem;">No matching tasks found.</p>`;
        return;
    }

    filtered.forEach(t => {
        const li = document.createElement("li");
        
        li.className = `transaction-item ${t.status}`;
        
        li.setAttribute("data-id", t.id);
        li.setAttribute("data-status", t.status);
        li.setAttribute("data-category", t.category);

        const checkIcon = t.status === "completed" ? "checkbox" : "square-outline";

        li.innerHTML = `
            <div class="tx-info">
              <span class="tx-title">${t.title}</span>
              <span class="tx-date">Category: ${t.category}</span>
            </div>
            <div class="tx-amount-action">
              <span class="tx-val">${t.category}</span>
              <button class="action-btn complete"><ion-icon name="${checkIcon}"></ion-icon></button>
              <button class="action-btn edit"><ion-icon name="create-outline"></ion-icon></button>
              <button class="action-btn delete"><ion-icon name="trash-outline"></ion-icon></button>
            </div>
        `;

        taskListUl.appendChild(li);
    });
}

function renderChart() {
    const ctx = document.getElementById("taskBreakdownChart").getContext("2d");
    
    const completed = tasks.filter(t => t.status === "completed").length;
    const pending = tasks.length - completed;

    if (taskChart) {
        taskChart.destroy();
    }

    taskChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Completed", "Pending"],
            datasets: [{
                data: [completed, pending],
                backgroundColor: ["#10b981", "#f43f5e"],
                borderWidth: document.body.classList.contains("dark-theme") ? 3 : 1,
                borderColor: document.body.classList.contains("dark-theme") ? "#1e293b" : "#ffffff",
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: document.body.classList.contains("dark-theme") ? "#f8fafc" : "#1e293b",
                        font: { family: "Manrope", weight: "600" }
                    }
                }
            }
        }
    });
}

function saveToStorage() {
    localStorage.setItem("taskExplorer_tasks", JSON.stringify(tasks));
    localStorage.setItem("taskExplorer_settings", JSON.stringify(appSettings));
}

function loadFromStorage() {
    const storedTasks = localStorage.getItem("taskExplorer_tasks");
    const storedSettings = localStorage.getItem("taskExplorer_settings");

    if (storedTasks) tasks = JSON.parse(storedTasks);
    if (storedSettings) appSettings = JSON.parse(storedSettings);
}