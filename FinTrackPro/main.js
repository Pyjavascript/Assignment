let transactions = [];
let appSettings = {
    username: "Manpreet Singh",
    currency: "INR",
    darkMode: false
};

const currencySymbols = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    INR: "₹",
    JPY: "¥"
};

let cashFlowChart = null;

const navDashboard = document.getElementById("nav-dashboard");
const navSettings = document.getElementById("nav-settings");
const dashboardView = document.getElementById("dashboard-view");
const settingsView = document.getElementById("settings-view");

const openModalBtn = document.getElementById("open-modal-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const transactionModal = document.getElementById("transaction-modal");
const transactionForm = document.getElementById("transaction-form");

const totalBalanceEl = document.getElementById("total-balance");
const totalIncomeEl = document.getElementById("total-income");
const totalExpenseEl = document.getElementById("total-expense");
const transactionListUl = document.getElementById("transaction-list-ul");
const filterButtons = document.querySelectorAll(".filter-btn");

const usernameInput = document.getElementById("username");
const currencySelect = document.getElementById("currency-select");
const darkModeToggle = document.getElementById("dark-mode-toggle");
const resetDataBtn = document.getElementById("reset-data-btn");

let currentFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
    loadDataFromLocalStorage();
    initApp();
});

navDashboard.addEventListener("click", () => switchView("dashboard"));
navSettings.addEventListener("click", () => switchView("settings"));

openModalBtn.addEventListener("click", () => transactionModal.classList.remove("hidden"));
closeModalBtn.addEventListener("click", () => transactionModal.classList.add("hidden"));
transactionModal.addEventListener("click", (e) => {
    if (e.target === transactionModal) transactionModal.classList.add("hidden");
});

transactionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const description = document.getElementById("tx-description").value.trim();
    const amount = parseFloat(document.getElementById("tx-amount").value);
    const type = document.getElementById("tx-type").value;

    const newTransaction = {
        id: Date.now(),
        description,
        amount,
        type,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    transactions.unshift(newTransaction);
    saveDataToLocalStorage();
    
    updateUI();
    
    transactionForm.reset();
    transactionModal.classList.add("hidden");
});

filterButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
        filterButtons.forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        currentFilter = e.target.getAttribute("data-filter");
        renderTransactionList();
    });
});

usernameInput.addEventListener("input", () => {
    appSettings.username = usernameInput.value;
    saveDataToLocalStorage();
});

currencySelect.addEventListener("change", () => {
    appSettings.currency = currencySelect.value;
    saveDataToLocalStorage();
    updateUI();
});

darkModeToggle.addEventListener("click", () => {
    appSettings.darkMode = !appSettings.darkMode;
    saveDataToLocalStorage();
    applyTheme();
});

resetDataBtn.addEventListener("click", () => {
    if(confirm("Are you absolutely sure you want to completely clear out all tracking data metrics?")) {
        localStorage.clear();
        transactions = [];
        appSettings = { username: "Manpreet Singh", currency: "INR", darkMode: false };
        applyTheme();
        updateUI();
        switchView("dashboard");
    }
});

function initApp() {
    applyTheme();
    usernameInput.value = appSettings.username;
    currencySelect.value = appSettings.currency;
    updateUI();
}

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

function formatCurrency(value) {
    const symbol = currencySymbols[appSettings.currency] || "$";
    return `${symbol}${Math.abs(value).toFixed(2)}`;
}

function updateUI() {
    calculateFinancials();
    renderTransactionList();
    renderChart();
}

function calculateFinancials() {
    let incomeSum = 0;
    let expenseSum = 0;

    transactions.forEach(tx => {
        if (tx.type === "income") incomeSum += tx.amount;
        if (tx.type === "expense") expenseSum += tx.amount;
    });

    const netBalance = incomeSum - expenseSum;

    totalBalanceEl.textContent = formatCurrency(netBalance);
    totalIncomeEl.textContent = `+${formatCurrency(incomeSum)}`;
    totalExpenseEl.textContent = `-${formatCurrency(expenseSum)}`;
    
    if (netBalance < 0) {
        totalBalanceEl.style.color = "var(--expense)";
    } else {
        totalBalanceEl.style.color = "var(--text-main)";
    }
}

function renderTransactionList() {
    transactionListUl.innerHTML = "";

    const filtered = transactions.filter(tx => {
        if (currentFilter === "all") return true;
        return tx.type === currentFilter;
    });

    if (filtered.length === 0) {
        transactionListUl.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 2rem;">No transaction activities matched.</p>`;
        return;
    }

    filtered.forEach(tx => {
        const li = document.createElement("li");
        li.className = `transaction-item ${tx.type}`;

        li.innerHTML = `
            <div class="tx-info">
              <span class="tx-title">${tx.description}</span>
              <span class="tx-date">${tx.date}</span>
            </div>
            <div class="tx-amount-action">
              <span class="tx-val">${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}</span>
              <button class="delete-tx-btn" data-id="${tx.id}">
                <ion-icon name="trash-outline"></ion-icon>
              </button>
            </div>
        `;

        li.querySelector(".delete-tx-btn").addEventListener("click", (e) => {
            const targetId = parseInt(e.currentTarget.getAttribute("data-id"));
            transactions = transactions.filter(t => t.id !== targetId);
            saveDataToLocalStorage();
            updateUI();
        });

        transactionListUl.appendChild(li);
    });
}

function renderChart() {
    const ctx = document.getElementById("cashFlowChart").getContext("2d");
    
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(tx => {
        if (tx.type === "income") totalIncome += tx.amount;
        if (tx.type === "expense") totalExpense += tx.amount;
    });

    if (cashFlowChart) {
        cashFlowChart.destroy();
    }

    cashFlowChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Income", "Expenses"],
            datasets: [{
                data: [totalIncome, totalExpense],
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

function saveDataToLocalStorage() {
    localStorage.setItem("finTrack_transactions", JSON.stringify(transactions));
    localStorage.setItem("finTrack_settings", JSON.stringify(appSettings));
}

function loadDataFromLocalStorage() {
    const storedTx = localStorage.getItem("finTrack_transactions");
    const storedSettings = localStorage.getItem("finTrack_settings");

    if (storedTx) transactions = JSON.parse(storedTx);
    if (storedSettings) appSettings = JSON.parse(storedSettings);
}