if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}

const themeToggle = document.getElementById("themeToggle");
const body = document.body;
const mainContainer = document.getElementById("mainContainer");
const loginContainer = document.getElementById("loginContainer");

const ADMIN_HASH = "e5209f41685bc273dfc3d5e54db543d464798fdbcba5f20ebce9d4886c2be94b";
let activeHistoryTab = "retail";
let cart = [];

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

themeToggle.addEventListener("click", () => applyTheme(!body.classList.contains("dark")));

// --- Auth ---
if (localStorage.getItem("adminLoggedIn") === "true") {
    loginContainer.style.display = "none";
    mainContainer.style.display = "block";
}

document.getElementById("adminPassword").addEventListener("keydown", e => { if (e.key === "Enter") checkPassword(); });
document.getElementById("codeInput").addEventListener("keydown", e => { if (e.key === "Enter") calculatePrice(); });
document.getElementById("wholesaleInput").addEventListener("keydown", e => { if (e.key === "Enter") calculateWholesale(); });
document.getElementById("cartCode").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("cartSP").focus(); });
document.getElementById("cartSP").addEventListener("keydown", e => { if (e.key === "Enter") addToCart(); });

document.getElementById("cartCode").addEventListener("input", () => {
    const input = document.getElementById("cartCode").value.toUpperCase().trim();
    const decoded = document.getElementById("cartDecoded");
    if (!input) { decoded.textContent = ""; return; }
    const price = decodeCode(input);
    if (price === null) {
        decoded.textContent = "Invalid code";
        decoded.style.color = "var(--loss)";
    } else {
        const cp = Math.floor(price / 2);
        decoded.textContent = `MP: ${price}  |  CP: ${cp}`;
        decoded.style.color = "";
    }
});

window.onload = function() {
    loadHistory("retail");
    loadHistory("wholesale");
    loadSales();
    updateCounter();
};

// --- Auth functions ---
async function checkPassword() {
    const inputEl = document.getElementById("adminPassword");
    const errorDiv = document.getElementById("loginError");
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(inputEl.value));
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
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

// --- Calculator ---
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
    div.querySelector(".delete-btn").addEventListener("click", () => confirmDeleteHistory(type, item, wrapper));
    addSwipe(div, bg, () => confirmDeleteHistory(type, item, wrapper));
    wrapper.appendChild(bg);
    wrapper.appendChild(div);
    if (prepend) { box.prepend(wrapper); } else { box.appendChild(wrapper); }
}

function updateTotals(type) {
    let history = JSON.parse(localStorage.getItem("history_" + type)) || [];
    document.getElementById(type + "ItemCount").textContent = `${history.length} item${history.length !== 1 ? "s" : ""}`;
    if (history.length === 0) { document.getElementById(type + "Totals").style.display = "none"; return; }
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

// --- Cart ---
function addToCart() {
    const codeEl = document.getElementById("cartCode");
    const spEl = document.getElementById("cartSP");
    const qtyEl = document.getElementById("cartQty");
    const decodedEl = document.getElementById("cartDecoded");

    const code = codeEl.value.toUpperCase().trim();
    const sp = parseFloat(spEl.value);
    const qty = parseInt(qtyEl.value) || 1;

    if (!code) { decodedEl.textContent = "Please enter a code."; decodedEl.style.color = "var(--loss)"; return; }
    const mp = decodeCode(code);
    if (mp === null) { decodedEl.textContent = "Invalid code — only A-J allowed."; decodedEl.style.color = "var(--loss)"; return; }
    if (isNaN(sp) || sp < 0) { decodedEl.textContent = "Please enter a valid SP."; decodedEl.style.color = "var(--loss)"; return; }
    if (qty < 1) { decodedEl.textContent = "Qty must be at least 1."; decodedEl.style.color = "var(--loss)"; return; }

    const cp = Math.floor(mp / 2);
    const profit = (sp - cp) * qty;

    cart.push({ code, mp, cp, sp, qty, profit });

    codeEl.value = "";
    spEl.value = "";
    qtyEl.value = "1";
    decodedEl.textContent = "";
    decodedEl.style.color = "";

    renderCart();
    codeEl.focus();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function renderCart() {
    const cartItemsEl = document.getElementById("cartItems");
    const cartTotalEl = document.getElementById("cartTotal");

    if (cart.length === 0) {
        cartItemsEl.innerHTML = "";
        cartTotalEl.innerHTML = "";
        return;
    }

    cartItemsEl.innerHTML = cart.map((item, i) => {
        const pl = item.profit >= 0 ? `+${item.profit}` : `${item.profit}`;
        const plColor = item.profit > 0 ? "var(--profit)" : item.profit < 0 ? "var(--loss)" : "inherit";
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <span class="cart-item-code">${item.code}</span>
                    <span class="cart-item-details">
                        MP:${item.mp} CP:${item.cp} SP:${item.sp}
                        ${item.qty > 1 ? `×${item.qty}` : ""}
                        = SP total: ${item.sp * item.qty}
                        &nbsp;<span style="color:${plColor};font-weight:600;">${pl}</span>
                    </span>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${i})">✕</button>
            </div>
        `;
    }).join("");

    const totalSP = cart.reduce((s, i) => s + i.sp * i.qty, 0);
    const totalCP = cart.reduce((s, i) => s + i.cp * i.qty, 0);
    const totalProfit = cart.reduce((s, i) => s + i.profit, 0);
    const plSign = totalProfit >= 0 ? "+" : "";
    const plColor = totalProfit > 0 ? "var(--profit)" : totalProfit < 0 ? "var(--loss)" : "inherit";

    cartTotalEl.innerHTML = `
        ${cart.length} item${cart.length !== 1 ? "s" : ""} &nbsp;|&nbsp;
        Total SP: <strong>${totalSP}</strong> &nbsp;|&nbsp;
        Total CP: <strong>${totalCP}</strong> &nbsp;|&nbsp;
        P/L: <strong style="color:${plColor}">${plSign}${totalProfit}</strong>
    `;
}

function clearCart() {
    cart = [];
    document.getElementById("customerName").value = "";
    document.getElementById("cartCode").value = "";
    document.getElementById("cartSP").value = "";
    document.getElementById("cartQty").value = "1";
    document.getElementById("cartDecoded").textContent = "";
    renderCart();
}

function saveSale() {
    if (cart.length === 0) {
        document.getElementById("cartDecoded").textContent = "Add at least one item first.";
        document.getElementById("cartDecoded").style.color = "var(--loss)";
        return;
    }

    const customerName = document.getElementById("customerName").value.trim() || "Customer";
    const totalSP = cart.reduce((s, i) => s + i.sp * i.qty, 0);
    const totalCP = cart.reduce((s, i) => s + i.cp * i.qty, 0);
    const totalMP = cart.reduce((s, i) => s + i.mp * i.qty, 0);
    const totalProfit = cart.reduce((s, i) => s + i.profit, 0);
    const totalItems = cart.reduce((s, i) => s + i.qty, 0);

    const sale = {
        customer: customerName,
        products: [...cart],
        totalSP,
        totalCP,
        totalMP,
        totalProfit,
        totalItems,
        time: getTime()
    };

    let sales = JSON.parse(localStorage.getItem("sales")) || [];
    sales.unshift(sale);
    localStorage.setItem("sales", JSON.stringify(sales));

    renderSaleEntry(sale, true);
    updateSalesSummary();
    clearCart();
}

// --- Sales List ---
function loadSales() {
    let sales = JSON.parse(localStorage.getItem("sales")) || [];
    sales.forEach(sale => renderSaleEntry(sale, false));
    updateSalesSummary();
}

function renderSaleEntry(sale, prepend) {
    const box = document.getElementById("salesBox");
    const wrapper = document.createElement("div");
    wrapper.className = "sale-entry-wrapper";

    const bg = document.createElement("div");
    bg.className = "swipe-delete-bg";
    bg.innerHTML = "🗑 Delete";

    const div = document.createElement("div");
    div.className = "sale-entry";
    if (prepend) div.classList.add("flash-new");

    const isProfit = sale.totalProfit > 0;
    const isEven = sale.totalProfit === 0;
    const plClass = isEven ? "set-even" : (isProfit ? "set-profit" : "set-loss");
    const plSign = isProfit ? "+" : "";

    const productSummary = (sale.products || []).map(p =>
        `${p.code}×${p.qty} SP:${p.sp}`
    ).join(", ");

    div.innerHTML = `
        <div class="sale-entry-header">
            <span class="sale-entry-customer">${sale.customer}</span>
            <span class="sale-entry-time">${sale.time || ""}</span>
        </div>
        <div class="sale-entry-products">${productSummary} &nbsp;(${sale.totalItems || 0} item${(sale.totalItems || 0) !== 1 ? "s" : ""})</div>
        <div class="sale-entry-totals">
            <span>MP: <strong>${sale.totalMP || 0}</strong></span>
            <span>CP: <strong>${sale.totalCP || 0}</strong></span>
            <span class="set-sp">SP: ${sale.totalSP || 0}</span>
            <span class="${plClass}">${plSign}${sale.totalProfit || 0}</span>
        </div>
        <button class="delete-btn" style="position:absolute;top:10px;right:10px;">✕</button>
    `;

    div.querySelector(".delete-btn").addEventListener("click", () => confirmDeleteSale(sale, wrapper));
    addSwipe(div, bg, () => confirmDeleteSale(sale, wrapper));
    wrapper.appendChild(bg);
    wrapper.appendChild(div);
    if (prepend) { box.prepend(wrapper); } else { box.appendChild(wrapper); }
}

function updateSalesSummary() {
    let sales = JSON.parse(localStorage.getItem("sales")) || [];
    const totalSales = sales.length;
    const totalItems = sales.reduce((s, i) => s + (i.totalItems || 0), 0);
    document.getElementById("salesCount").textContent =
        `${totalSales} sale${totalSales !== 1 ? "s" : ""} · ${totalItems} item${totalItems !== 1 ? "s" : ""}`;

    const summaryEl = document.getElementById("salesSummary");
    if (sales.length === 0) {
        summaryEl.innerHTML = `<p class="sales-empty">No sales recorded yet.</p>`;
        return;
    }

    const totalMP = sales.reduce((s, i) => s + (i.totalMP || 0), 0);
    const totalCP = sales.reduce((s, i) => s + (i.totalCP || 0), 0);
    const totalSP = sales.reduce((s, i) => s + (i.totalSP || 0), 0);
    const totalProfit = sales.reduce((s, i) => s + (i.totalProfit || 0), 0);
    const profitPct = totalCP > 0 ? ((totalProfit / totalCP) * 100).toFixed(1) : "0.0";
    const isProfit = totalProfit > 0;
    const isEven = totalProfit === 0;
    const plClass = isEven ? "ss-even" : (isProfit ? "ss-profit" : "ss-loss");
    const plLabel = isEven ? "Break Even" : (isProfit ? "Total Profit" : "Total Loss");
    const plSign = isProfit ? "+" : "";

    summaryEl.innerHTML = `
        <div class="sales-summary-card">
            <div class="ss-row">
                <span class="ss-label">Transactions</span>
                <span class="ss-value">${totalSales}</span>
            </div>
            <div class="ss-row">
                <span class="ss-label">Total Items Sold</span>
                <span class="ss-value">${totalItems}</span>
            </div>
            <div class="ss-row">
                <span class="ss-label">Total MP</span>
                <span class="ss-value" style="color:#6a11cb">${totalMP}</span>
            </div>
            <div class="ss-row">
                <span class="ss-label">Total CP</span>
                <span class="ss-value" style="color:#2575fc">${totalCP}</span>
            </div>
            <div class="ss-row">
                <span class="ss-label">Total SP (Revenue)</span>
                <span class="ss-value" style="color:#0891b2">${totalSP}</span>
            </div>
            <div class="ss-row ${plClass}">
                <span class="ss-label">${plLabel}</span>
                <span class="ss-value">${plSign}${totalProfit} (${plSign}${profitPct}%)</span>
            </div>
        </div>
    `;
}

// --- Swipe ---
function addSwipe(el, bg, onDelete) {
    let startX = 0, currentX = 0, isDragging = false;
    const THRESHOLD = 80;
    function onStart(x) { startX = x; isDragging = true; el.classList.add("swiping"); }
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

// --- Delete ---
function confirmDeleteHistory(type, item, wrapper) {
    showConfirm(`Delete "${item.code}" from history?`, () => {
        let history = JSON.parse(localStorage.getItem("history_" + type)) || [];
        const index = history.findIndex(i => i.code === item.code && (i.time || "") === (item.time || ""));
        if (index !== -1) history.splice(index, 1);
        localStorage.setItem("history_" + type, JSON.stringify(history));
        wrapper.remove();
        updateTotals(type);
    });
}

function confirmDeleteSale(sale, wrapper) {
    showConfirm(`Delete sale for "${sale.customer}"?`, () => {
        let sales = JSON.parse(localStorage.getItem("sales")) || [];
        const index = sales.findIndex(s => s.customer === sale.customer && s.time === sale.time);
        if (index !== -1) sales.splice(index, 1);
        localStorage.setItem("sales", JSON.stringify(sales));
        wrapper.remove();
        updateSalesSummary();
    });
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
        updateTotals(activeHistoryTab);
    });
}

function confirmClearSales() {
    showConfirm("Clear all sales? This cannot be undone.", () => {
        localStorage.removeItem("sales");
        document.getElementById("salesBox").innerHTML = "";
        updateSalesSummary();
    });
}
