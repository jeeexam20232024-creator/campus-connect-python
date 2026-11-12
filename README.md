# 🎓 Campus Connect — Full-Stack Career Intelligence & Mentorship Platform

**Live Application:** [https://campus-connect-python.vercel.app](https://campus-connect-python.vercel.app)

A full-stack career readiness and alumni mentorship platform built with **FastAPI**, **Vanilla HTML/CSS/JavaScript**, and **Supabase (Auth + PostgreSQL)**, deployed serverless on **Vercel**.

---

## ✨ Core Modules & Features

* **🔐 Authentication & Route Protection:** Email/password and OAuth sign-in powered by Supabase GoTrue Auth, with JWT-verified session checks protecting `/dashboard.html`.
* **🤖 Real-Time ATS Score Predictor:** Parses uploaded PDF (`pypdf`) or pasted resumes against target job descriptions to compute compatibility scores, missing hard/soft skills, section coverage, and actionable recommendations.
* **💼 Multi-Platform Job Aggregator & TF-IDF Matcher:** Aggregates opportunities across LinkedIn, Indeed, Internshala, and Unstop, dynamically ranking listings via a lightweight TF-IDF vectorization and Cosine Similarity engine.
* **🎯 Student Skill Matrix & Gap Analysis:** Interactive proficiency sliders benchmarked against industry role expectations (*Backend Engineer*, *AI / ML Engineer*, *Full-Stack Developer*) to generate prioritized readiness diagnostics.
* **🤝 Alumni Mentorship & Interview Bank:** Enables students to book 1-on-1 mock interviews with alumni mentors, browse company-specific technical & behavioral question banks, and share updates in a persistent PostgreSQL community forum.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Responsive Grid & Dark Slate UI), JavaScript (ES6+ Fetch API) |
| **Backend** | Python 3, FastAPI, Pydantic, `pypdf` |
| **Database & Auth** | Supabase (PostgreSQL + Row-Level Auth) |
| **Deployment & Workflow** | Vercel Serverless Functions, GitHub Feature-Branch & Pull Request Workflow |

---

## 📁 Project Structure

```text
campus-connect-python/
├── api/
│   └── index.py          # FastAPI serverless backend & API routes
├── public/
│   ├── css/
│   │   └── style.css     # Responsive dark-slate dashboard styling
│   ├── js/
│   │   └── app.js        # Frontend auth, ATS, job matching & alumni logic
│   ├── index.html        # Login & registration portal
│   └── dashboard.html    # Protected multi-module student dashboard
├── requirements.txt      # Python runtime dependencies
├── vercel.json           # Vercel serverless routing & static asset rules
└── README.md