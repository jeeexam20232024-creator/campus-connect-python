let mode = "login";

function switchMode(newMode) {
  mode = newMode;
  document.getElementById("tab-login").classList.toggle("active", mode === "login");
  document.getElementById("tab-signup").classList.toggle("active", mode === "signup");
  document.getElementById("full_name").style.display = mode === "signup" ? "block" : "none";
  document.getElementById("submit-btn").textContent = mode === "login" ? "Sign In" : "Create Account";
  document.getElementById("msg").textContent = "";
}

const form = document.getElementById("auth-form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("msg");
    msg.style.color = "#38bdf8";
    msg.textContent = "Processing...";

    const payload = {
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
      full_name: document.getElementById("full_name").value
    };

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      msg.style.color = "#f87171";
      msg.textContent = data.detail || "Authentication failed";
      return;
    }

    if (mode === "signup") {
      msg.style.color = "#4ade80";
      msg.textContent = "Account created! Switching to Sign In...";
      setTimeout(() => switchMode("login"), 1200);
    } else {
      localStorage.setItem("cc_token", data.access_token);
      window.location.href = "/dashboard.html";
    }
  });
}

async function oauthSignIn(provider) {
  const redirectUrl = `${window.location.origin}/dashboard.html`;
  const res = await fetch(`/api/auth/oauth/${provider}?redirect_to=${encodeURIComponent(redirectUrl)}`);
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

// Route Protection on Dashboard
if (window.location.pathname.endsWith("dashboard.html")) {
  (async () => {
    // Capture OAuth token if redirected back with #access_token=...
    if (window.location.hash.includes("access_token=")) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const token = params.get("access_token");
      if (token) {
        localStorage.setItem("cc_token", token);
        window.history.replaceState({}, document.title, "/dashboard.html");
      }
    }

    const token = localStorage.getItem("cc_token");
    if (!token) {
      window.location.href = "/index.html";
      return;
    }

    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      localStorage.removeItem("cc_token");
      window.location.href = "/index.html";
      return;
    }

    const data = await res.json();
    document.getElementById("user-email").textContent = `Signed in as: ${data.user.email}`;
  })();
}

function logout() {
  localStorage.removeItem("cc_token");
  window.location.href = "/index.html";
}