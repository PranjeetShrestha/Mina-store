const ADMIN_PASSWORD = "1234";

// Wait until page fully loads
document.addEventListener("DOMContentLoaded", function () {

    // Dark mode toggle
    const toggleBtn = document.getElementById("themeToggle");

    if (toggleBtn) {
        toggleBtn.addEventListener("click", function () {
            document.body.classList.toggle("dark");
            toggleBtn.textContent =
                document.body.classList.contains("dark") ? "☀️" : "🌙";
        });
    }

});

// Login
function checkPassword() {
    const input = document.getElementById("adminPassword").value;
    const error = document.getElementById("loginError");

    if (input === ADMIN_PASSWORD) {
        document.getElementById("loginContainer").style.display = "none";
        document.getElementById("mainContainer").style.display = "block";
        error.textContent = "";
    } else {
        error.textContent = "Incorrect password!";
    }
}

// Price calculation
function calculatePrice() {
    const codeInput = document.getElementById("codeInput");
    const result = document.getElementById("result");
    const history = document.getElementById("history");

    const code = codeInput.value.toUpperCase();

    if (!/^[A-J]+$/.test(code)) {
        result.textContent = "Invalid code! Use letters A-J only.";
        return;
    }

    const price = code.length * 10;
    result.textContent = "Total Price: $" + price;

    const item = document.createElement("div");
    item.className = "history-item";
    item.textContent = code + " → $" + price;
    history.appendChild(item);

    codeInput.value = "";
}

// Clear history
function clearHistory() {
    document.getElementById("history").innerHTML = "";
}
