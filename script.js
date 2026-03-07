const themeToggle = document.getElementById("themeToggle");
const body = document.body;
const historyDiv = document.getElementById("history");
const mainContainer = document.getElementById("mainContainer");
const loginContainer = document.getElementById("loginContainer");

const ADMIN_HASH = "e5209f41685bc273dfc3d5e54db543d464798fdbcba5f20ebce9d4886c2be94b";
const SHOW_MARGINS = false;

// Check if admin already logged in
if (localStorage.getItem("adminLoggedIn") === "true") {
    loginContainer.style.display = "none";
    mainContainer.style.display = "block";
}

// Load theme
if (localStorage.getItem("theme") === "dark") {
    body.classList.add("dark");
    themeToggle.textContent = "☀️";
}

// Toggle dark mode
themeToggle.addEventListener("click", () => {
    body.classList.toggle("dark");
    if (body.classList.contains("dark")) {
        localStorage.setItem("theme", "dark");
        themeToggle.textContent = "☀️";
    } else {
        localStorage.setItem("theme", "light");
        themeToggle.textContent = "🌙";
    }
});

// Load history
window.onload = function() {
    let history = JSON.parse(localStorage.getItem("history")) || [];
    history.forEach(item => addToHistory(item));
};

// Admin login check
async function checkPassword() {
    const input = document.getElementById("adminPassword").value;
    const errorDiv = document.getElementById("loginError");
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0")).join("");
    if (hashHex === ADMIN_HASH) {
        localStorage.setItem("adminLoggedIn", "true");
        loginContainer.style.display = "none";
        mainContainer.style.display = "block";
    } else {
        errorDiv.textContent = "Incorrect password!";
    }
}

function calculatePrice() {
    let input = document.getElementById("codeInput").value.toUpperCase();
    let price = 0;

    for (let i = 0; i < input.length; i++) {
        let ch = input[i];
        if (ch < 'A' || ch > 'J') {
            alert("Only letters A-J allowed!");
            return;
        }
        price = (ch.charCodeAt(0) - 65) + price * 10;
    }

    let cp = Math.floor(price / 2);

    const resultHTML = `
        <strong>MP:</strong> ${price} <br>
        <strong>CP:</strong> ${cp} <br><br>
    `;

    document.getElementById("result").innerHTML = resultHTML;

    const historyItem = input + " → MP:" + price + " CP:" + cp;
    saveHistory(historyItem);
    addToHistory(historyItem);
}

function saveHistory(item) {
    const MAX = 50;
    let history = JSON.parse(localStorage.getItem("history")) || [];
    history.unshift(item);
    if (history.length > MAX) history = history.slice(0, MAX);
    localStorage.setItem("history", JSON.stringify(history));
}

function addToHistory(item) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.textContent = item;
    historyDiv.prepend(div);
}

function clearHistory() {
    localStorage.removeItem("history");
    historyDiv.innerHTML = "";
}
