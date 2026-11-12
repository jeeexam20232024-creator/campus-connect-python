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
  
  async function fetchMatchedJobs() {
    const list = document.getElementById("jobs-list");
    list.innerHTML = `<p style="color:#94a3b8;">Running TF-IDF + Cosine Similarity matching...</p>`;
  
    const payload = {
      candidate_skills: document.getElementById("candidate_skills").value,
      search_query: document.getElementById("job_search").value,
      platform: document.getElementById("job_platform").value
    };
  
    const res = await fetch("/api/jobs/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
  
    if (!data.jobs || data.jobs.length === 0) {
      list.innerHTML = `<p style="color:#94a3b8;">No matching roles found. Try clearing filters.</p>`;
      return;
    }
  
    list.innerHTML = data.jobs.map(job => `
      <div class="job-card">
        <div>
          <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.35rem;">
            <strong style="font-size:1.05rem; color:#f8fafc;">${job.title}</strong>
            <span class="platform-tag">${job.platform}</span>
          </div>
          <div style="color:#94a3b8; font-size:0.85rem; margin-bottom:0.5rem;">
            ${job.company} • ${job.location} • <strong style="color:#38bdf8;">${job.stipend}</strong>
          </div>
          <p style="color:#cbd5e1; font-size:0.88rem; line-height:1.45;">${job.description}</p>
        </div>
        <div style="text-align:right;">
          <div class="match-pill">${job.match_percentage}% Match</div>
          <a href="${job.apply_url}" target="_blank" style="display:inline-block; margin-top:0.6rem; color:#38bdf8; font-size:0.85rem; text-decoration:none;">Apply →</a>
        </div>
      </div>
    `).join("");
  }
  let currentUserEmail = "";
let cachedInterviewBank = {};

const ROLE_SKILLS = {
  "Backend Engineer": ["Python", "SQL & Databases", "REST APIs & FastAPI", "Data Structures & Algorithms", "Docker & Cloud", "Communication & Teamwork"],
  "AI / ML Engineer": ["Python", "SQL & Databases", "Machine Learning & NLP", "Data Structures & Algorithms", "Docker & Cloud", "Communication & Teamwork"],
  "Full-Stack Developer": ["Python", "SQL & Databases", "REST APIs & FastAPI", "Frontend (HTML/CSS/JS)", "Docker & Cloud", "Communication & Teamwork"]
};

function showSection(section) {
  ["ats", "jobs", "skills", "alumni"].forEach(s => {
    document.getElementById(`section-${s}`).style.display = s === section ? "block" : "none";
    document.getElementById(`nav-${s}`).classList.toggle("active", s === section);
  });
  if (section === "jobs") fetchMatchedJobs();
  if (section === "skills") renderSkillSliders();
  if (section === "alumni") loadAlumniPortal();
}

function renderSkillSliders() {
  const role = document.getElementById("target_role").value;
  const skills = ROLE_SKILLS[role];
  document.getElementById("skill-sliders").innerHTML = skills.map(skill => `
    <div style="background:#0f172a; padding:0.85rem; border-radius:8px; border:1px solid #334155;">
      <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
        <span>${skill}</span>
        <strong id="val-${skill}" style="color:#38bdf8;">60%</strong>
      </div>
      <input type="range" min="0" max="100" value="60" data-skill="${skill}"
        oninput="document.getElementById('val-${skill}').textContent = this.value + '%'" style="margin:0;" />
    </div>
  `).join("");
}

async function runSkillGapAnalysis() {
  const role = document.getElementById("target_role").value;
  const skills = {};
  document.querySelectorAll("#skill-sliders input[type='range']").forEach(el => {
    skills[el.dataset.skill] = parseInt(el.value, 10);
  });

  const res = await fetch("/api/skills/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_role: role, skills })
  });
  const data = await res.json();
  const box = document.getElementById("skill-report");
  box.style.display = "block";
  box.innerHTML = `
    <div style="margin-bottom:1rem;">
      <span style="color:#94a3b8;">ROLE READINESS SCORE (${data.target_role}):</span>
      <span class="score-badge" style="margin-left:0.6rem;">${data.readiness_score}%</span>
    </div>
    ${data.report.map(r => `
      <div style="margin-bottom:0.75rem;">
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:0.25rem;">
          <span>${r.skill} (You: ${r.current}% vs Target: ${r.target}%)</span>
          <strong style="color:${r.gap === 0 ? '#4ade80' : '#fbbf24'};">${r.status}</strong>
        </div>
        <div style="background:#1e293b; height:8px; border-radius:6px; overflow:hidden;">
          <div style="width:${r.current}%; background:${r.gap === 0 ? '#4ade80' : '#38bdf8'}; height:100%;"></div>
        </div>
      </div>
    `).join("")}
  `;
}

async function loadAlumniPortal() {
  const res = await fetch("/api/alumni/overview");
  const data = await res.json();
  cachedInterviewBank = data.interview_bank || {};

  document.getElementById("alumni-grid").innerHTML = data.alumni.map(a => `
    <div style="background:#0f172a; padding:1rem; border-radius:10px; border:1px solid #334155;">
      <strong style="color:#f8fafc;">${a.name}</strong> <span class="platform-tag">Batch ${a.batch}</span>
      <div style="color:#38bdf8; font-size:0.88rem; margin:0.25rem 0;">${a.role} @ ${a.company}</div>
      <p style="color:#94a3b8; font-size:0.85rem; margin-bottom:0.75rem;">${a.specialty}</p>
      <button class="btn-primary btn-sm" onclick="requestMentorship('${a.name}', '${a.company}')">Request Mock Interview</button>
    </div>
  `).join("");

  renderInterviewQuestions();

  document.getElementById("forum-feed").innerHTML = (data.posts || []).map(p => `
    <div style="background:#0f172a; padding:0.9rem; border-radius:8px; border:1px solid #334155; margin-bottom:0.6rem;">
      <strong style="color:#f8fafc;">${p.title}</strong>
      <div style="color:#94a3b8; font-size:0.8rem; margin-bottom:0.35rem;">Posted by ${p.author_email}</div>
      <p style="color:#cbd5e1; font-size:0.9rem;">${p.content}</p>
    </div>
  `).join("") || `<p style="color:#94a3b8;">No posts yet—be the first to share an interview insight!</p>`;
}

function renderInterviewQuestions() {
  const company = document.getElementById("bank-company").value;
  const qs = cachedInterviewBank[company] || [];
  document.getElementById("bank-questions").innerHTML = `
    <ul class="rec-list">${qs.map(q => `<li>${q}</li>`).join("")}</ul>
  `;
}

async function requestMentorship(mentorName, company) {
  const topic = prompt(`What topic would you like ${mentorName} (${company}) to cover in your 1-on-1 session?`, "DSA & Backend Mock Interview");
  if (!topic) return;
  const email = document.getElementById("user-email").textContent.replace("Signed in as: ", "");
  await fetch("/api/alumni/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_email: email, mentor_name: mentorName, company, topic })
  });
  alert(`Mock interview request sent to ${mentorName}!`);
}

async function submitForumPost() {
  const title = document.getElementById("post-title").value.trim();
  const content = document.getElementById("post-content").value.trim();
  if (!title || !content) return alert("Please enter both a title and content.");
  const email = document.getElementById("user-email").textContent.replace("Signed in as: ", "");
  await fetch("/api/alumni/forum", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author_email: email, title, content })
  });
  document.getElementById("post-title").value = "";
  document.getElementById("post-content").value = "";
  loadAlumniPortal();
}