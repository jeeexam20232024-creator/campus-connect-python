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
const atsForm = document.getElementById("ats-form");
if (atsForm) {
  atsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("ats-btn");
    const box = document.getElementById("ats-result");
    btn.textContent = "Analyzing Resume...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append("job_description", document.getElementById("job_description").value);
    formData.append("resume_text", document.getElementById("resume_text").value);
    const fileInput = document.getElementById("resume_file");
    if (fileInput.files.length > 0) {
      formData.append("resume_file", fileInput.files[0]);
    }

    try {
      const res = await fetch("/api/ats/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed");

      box.style.display = "block";
      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <div>
            <div style="color:#94a3b8; font-size:0.85rem;">ATS MATCH SCORE</div>
            <div class="score-badge">${data.ats_score}%</div>
          </div>
          <div style="text-align:right; color:#94a3b8; font-size:0.85rem;">
            Sections Detected: <strong>${data.found_sections.join(", ") || "None"}</strong>
          </div>
        </div>
        <div style="margin-bottom:0.75rem;">
          <strong style="color:#4ade80;">Matched Keywords:</strong><br/>
          ${data.matched_keywords.map(k => `<span class="pill pill-good">${k}</span>`).join("") || "None"}
        </div>
        <div style="margin-bottom:0.75rem;">
          <strong style="color:#f87171;">Missing Hard Skills:</strong><br/>
          ${data.missing_hard_keywords.map(k => `<span class="pill pill-miss">${k}</span>`).join("") || "None"}
        </div>
        <div style="margin-bottom:0.75rem;">
          <strong style="color:#fbbf24;">Missing Soft Skills:</strong><br/>
          ${data.missing_soft_keywords.map(k => `<span class="pill pill-miss">${k}</span>`).join("") || "None"}
        </div>
        <div>
          <strong>Actionable Recommendations:</strong>
          <ul class="rec-list">${data.recommendations.map(r => `<li>${r}</li>`).join("")}</ul>
        </div>
      `;
    } catch (err) {
      alert(err.message);
    } finally {
      btn.textContent = "Calculate ATS Compatibility Score";
      btn.disabled = false;
    }
  });
}