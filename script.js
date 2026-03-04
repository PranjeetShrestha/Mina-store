const themeToggle = document.getElementById("themeToggle");
const body = document.body;
const historyDiv = document.getElementById("history");
const mainContainer = document.getElementById("mainContainer");
const loginContainer = document.getElementById("loginContainer");

// Set your admin password here
const ADMIN_PASSWORD = "Min@store";

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
function checkPassword() {
    const input = document.getElementById("adminPassword").value;
    const errorDiv = document.getElementById("loginError");

    if (input === ADMIN_PASSWORD) {
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

    let price30 = Math.floor(cp * 1.30);
    let price35 = Math.floor(cp * 1.35);
    let price50 = Math.floor(cp * 1.50);
    let price60 = Math.floor(cp * 1.60);

    const resultHTML = `
        <strong>MP:</strong> ${price} <br>
        <strong>CP:</strong> ${cp} <br><br>
        <strong>30%:</strong> ${price30} |
        <strong>35%:</strong> ${price35} <br>
        <strong>50%:</strong> ${price50} |
        <strong>60%:</strong> ${price60}
    `;

    document.getElementById("result").innerHTML = resultHTML;

    const historyItem = input + " → MP:" + price + " CP:" + cp;
    saveHistory(historyItem);
    addToHistory(historyItem);
}

function saveHistory(item) {
    let history = JSON.parse(localStorage.getItem("history")) || [];
    history.unshift(item);
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
