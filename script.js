// --- PWA ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}

const themeToggle = document.getElementById("themeToggle");
const body = document.body;
const mainContainer = document.getElementById("mainContainer");
const loginContainer = document.getElementById("loginContainer");

const ADMIN_HASH = "e5209f41685bc273dfc3d5e54db543d464798fdbcba5f20ebce9d4886c2be94b";
let activeHistoryTab = "retail";

// --- Theme ---
function applyTheme(dark) {
    if (dark) {
        body.classList.add("dark");
        themeToggle.textContent = "☀️";
        localStorage.setItem("theme", "dark");
    } else {
        body.classList.remove("dark");
        themeToggle.textContent = "🌙";
        localStorage.setItem("theme", "light");
    }
}

const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    applyTheme(savedTheme === "dark");
} else {
    applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    if (!localStorage.getItem("theme")) applyTheme(e.matches);
});

themeToggle.addEventListener("click", () => {
    applyTheme(!body.classList.contains("dark"));
});

// --- Auth ---
if (localStorage.getItem("adminLoggedIn") === "true") {
    loginContainer.style.display = "none";
    mainContainer.style.display = "block";
}

document.getElementById("adminPassword").addEventListener("keydown", e => {
    if (e.key === "Enter") checkPassword();
});
document.getElementById("codeInput").addEventListener("keydown", e => {
    if (e.key === "Enter") calculatePrice();
});
document.getElementById("wholesaleInput").addEventListener("keydown", e => {
    if (e.key === "Enter") calculateWholesale();
});

window.onload = function() {
    loadHistory("retail");
    loadHistory("wholesale");
    updateCounter();
};

async function checkPassword() {
    const inputEl = document.getElementById("adminPassword");
    const errorDiv = document.getElementById("loginError");
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(inputEl.value));
    const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0")).join("");

    if (hashHex === ADMIN_HASH) {
        localStorage.setItem("adminLoggedIn", "true");
        loginContainer.style.display = "none";
        mainContainer.style.display = "block";
    } else {
        errorDiv.textContent = "Incorrect password!";
        inputEl.classList.remove("shake");
        void inputEl.offsetWidth;
        inputEl.classList.add("shake");
        inputEl.value = "";
        inputEl.addEventListener("animationend", () => inputEl.classList.remove("shake"), { once: true });
    }
}

function logout() {
    localStorage.removeItem("adminLoggedIn");
    location.reload();
}

// --- Tabs ---
function switchTab(tab) {
    document.getElementById("retailTab").style.display = tab === "retail" ? "block" : "none";
    document.getElementById("wholesaleTab").style.display = tab === "wholesale" ? "block" : "none";
    document.querySelectorAll(".tab-btn").forEach((btn, i) => {
        btn.classList.toggle("active", (i === 0 && tab === "retail") || (i === 1 && tab === "wholesale"));
    });
    switchHistory(tab);
}

function switchHistory(tab) {
    activeHistoryTab = tab;
    document.getElementById("retailHistoryWrapper").style.display = tab === "retail" ? "block" : "none";
    document.getElementById("wholesaleHistoryWrapper").style.display = tab === "wholesale" ? "block" : "none";
}

// --- Decode ---
function decodeCode(input) {
    let price = 0;
    for (let i = 0; i < input.length; i++) {
        let ch = input[i];
        if (ch < 'A' || ch > 'J') return null;
        price = (ch.charCodeAt(0) - 65) + price * 10;
    }
    return price;
}

// --- Counter ---
function updateCounter() {
    const today = new Date().toDateString();
    const saved = JSON.parse(localStorage.getItem("dailyCounter") || '{"date":"","count":0}');
    if (saved.date !== today) {
        localStorage.setItem("dailyCounter", JSON.stringify({ date: today, count: 0 }));
        document.getElementById("counterBadge").textContent = "0 today";
    } else {
        document.getElementById("counterBadge").textContent = `${saved.count} today`;
    }
}

function incrementCounter() {
    const today = new Date().toDateString();
    const saved = JSON.parse(localStorage.getItem("dailyCounter") || '{"date":"","count":0}');
    const count = saved.date === today ? saved.count + 1 : 1;
    localStorage.setItem("dailyCounter", JSON.stringify({ date: today, count }));
    document.getElementById("counterBadge").textContent = `${count} today`;
}

// --- Calculate ---
function calculatePrice() {
    const inputEl = document.getElementById("codeInput");
    const resultEl = document.getElementById("result");
    let input = inputEl.value.toUpperCase().trim();

    if (!input) { resultEl.innerHTML = `<span class="inline-error">Please enter a code.</span>`; return; }
    let price = decodeCode(input);
    if (price === null) { resultEl.innerHTML = `<span class="inline-error">Only letters A-J allowed!</span>`; return; }

    let cp = Math.floor(price / 2);
    resultEl.innerHTML = `<strong>MP:</strong> ${price} &nbsp;|&nbsp; <strong>CP:</strong> ${cp}`;

    const item = { code: input, mp: price, cp: cp, time: getTime() };
    saveHistory("retail", item);
    addToHistory("retail", item, true);
    updateTotals("retail");
    incrementCounter();

    inputEl.value = "";
    inputEl.focus();
}

function calculateWholesale() {
    const inputEl = document.getElementById("wholesaleInput");
    const resultEl = document.getElementById("wholesaleResult");
    let input = inputEl.value.toUpperCase().trim();

    if (!input) { resultEl.innerHTML = `<span class="inline-error">Please enter a code.</span>`; return; }
    let price = decodeCode(input);
    if (price === null) { resultEl.innerHTML = `<span class="inline-error">Only letters A-J allowed!</span>`; return; }

    let cp = Math.floor(price / 2);
    let wp = cp + cp * 0.1;
    if (wp % 5 !== 0) wp = wp + (5 - (wp % 5));
    wp = Math.floor(wp);

    resultEl.innerHTML = `<strong>MP:</strong> ${price} &nbsp;|&nbsp; <strong>CP:</strong> ${cp} &nbsp;|&nbsp; <strong>WP:</strong> ${wp}`;

    const item = { code: input, mp: price, cp: cp, wp: wp, time: getTime() };
    saveHistory("wholesale", item);
    addToHistory("wholesale", item, true);
    updateTotals("wholesale");
    incrementCounter();

    inputEl.value = "";
    inputEl.focus();
}

// --- Time ---
function getTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' + now.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

// --- History ---
function saveHistory(type, item) {
    const MAX = 50;
    let history = JSON.parse(localStorage.getItem("history_" + type)) || [];
    history.unshift(item);
    if (history.length > MAX) history = history.slice(0, MAX);
    localStorage.setItem("history_" + type, JSON.stringify(history));
}

function loadHistory(type) {
    let history = JSON.parse(localStorage.getItem("history_" + type)) || [];
    history.forEach(item => addToHistory(type, item, false));
    updateTotals(type);
}

function addToHistory(type, item, prepend) {
    const box = document.getElementById(type + "History");

    const wrapper = document.createElement("div");
    wrapper.className = "history-item-wrapper";

    const bg = document.createElement("div");
    bg.className = "swipe-delete-bg";
    bg.innerHTML = "🗑 Delete";

    const div = document.createElement("div");
    div.className = "history-item";
    if (prepend) div.classList.add("flash-new");

    const prices = type === "retail"
        ? `<span class="hi-mp">MP: ${item.mp}</span> &nbsp; <span class="hi-cp">CP: ${item.cp}</span>`
        : `<span class="hi-mp">MP: ${item.mp}</span> &nbsp; <span class="hi-cp">CP: ${item.cp}</span> &nbsp; <span class="hi-wp">WP: ${item.wp}</span>`;

    div.innerHTML = `
        <div class="history-item-left">
            <div class="hi-code">${item.code}</div>
            <div class="hi-time">${item.time || ""}</div>
            <div>${prices}</div>
        </div>
        <button class="delete-btn">✕</button>
    `;

    div.querySelector(".delete-btn").addEventListener("click", () => {
        confirmDelete(type, item, wrapper);
    });

    addSwipe(div, bg, () => confirmDelete(type, item, wrapper));

    wrapper.appendChild(bg);
    wrapper.appendChild(div);

    if (prepend) {
        box.prepend(wrapper);
    } else {
        box.appendChild(wrapper);
    }
}

function addSwipe(el, bg, onDelete) {
    let startX = 0, currentX = 0, isDragging = false;
    const THRESHOLD = 80;

    function onStart(x) {
        startX = x;
        isDragging = true;
        el.classList.add("swiping");
    }

    function onMove(x) {
        if (!isDragging) return;
        currentX = Math.min(0, x - startX);
        el.style.transform = `translateX(${currentX}px)`;
        bg.style.opacity = Math.min(1, Math.abs(currentX) / THRESHOLD);
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        el.classList.remove("swiping");
        if (Math.abs(currentX) >= THRESHOLD) {
            el.style.transform = `translateX(-100%)`;
            bg.style.opacity = "1";
            setTimeout(onDelete, 200);
        } else {
            el.style.transform = "";
            bg.style.opacity = "0";
        }
        currentX = 0;
    }

    el.addEventListener("touchstart", e => onStart(e.touches[0].clientX), { passive: true });
    el.addEventListener("touchmove", e => onMove(e.touches[0].clientX), { passive: true });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("mousedown", e => onStart(e.clientX));
    window.addEventListener("mousemove", e => { if (isDragging) onMove(e.clientX); });
    window.addEventListener("mouseup", onEnd);
}

function confirmDelete(type, item, wrapper) {
    showConfirm(`Delete "${item.code}" from history?`, () => {
        let history = JSON.parse(localStorage.getItem("history_" + type)) || [];
        const index = history.findIndex(i => i.code === item.code && (i.time || "") === (item.time || ""));
        if (index !== -1) history.splice(index, 1);
        localStorage.setItem("history_" + type, JSON.stringify(history));
        wrapper.remove();
        updateTotals(type);
    });
}

function updateTotals(type) {
    let history = JSON.parse(localStorage.getItem("history_" + type)) || [];
    if (history.length === 0) {
        document.getElementById(type + "Totals").style.display = "none";
        return;
    }
    document.getElementById(type + "Totals").style.display = "block";
    let totalMP = history.reduce((sum, i) => sum + i.mp, 0);
    let totalCP = history.reduce((sum, i) => sum + i.cp, 0);
    if (type === "retail") {
        document.getElementById("totalRetailMP").textContent = totalMP;
        document.getElementById("totalRetailCP").textContent = totalCP;
    } else {
        let totalWP = history.reduce((sum, i) => sum + i.wp, 0);
        document.getElementById("totalWholesaleMP").textContent = totalMP;
        document.getElementById("totalWholesaleCP").textContent = totalCP;
        document.getElementById("totalWholesaleWP").textContent = totalWP;
    }
}

// --- Confirm Dialog ---
function showConfirm(message, onConfirm) {
    document.getElementById("confirmMessage").textContent = message;
    document.getElementById("confirmOkBtn").onclick = () => { closeConfirm(); onConfirm(); };
    document.getElementById("confirmOverlay").classList.add("show");
}

function closeConfirm() {
    document.getElementById("confirmOverlay").classList.remove("show");
}

function confirmClearHistory() {
    showConfirm(`Clear all ${activeHistoryTab} history? This cannot be undone.`, () => {
        localStorage.removeItem("history_" + activeHistoryTab);
        document.getElementById(activeHistoryTab + "History").innerHTML = "";
        document.getElementById(activeHistoryTab + "Totals").style.display = "none";
    });
}
