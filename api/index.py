import io
import os
import re
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pypdf import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Campus Connect API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AuthRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class JobMatchRequest(BaseModel):
    candidate_skills: str
    search_query: str = ""
    platform: str = "All"

STOPWORDS = {
    "and", "the", "for", "with", "you", "will", "are", "this", "that", "from",
    "have", "has", "our", "your", "work", "team", "role", "years", "experience",
    "skills", "ability", "strong", "knowledge", "using", "such", "into", "their"
}

SOFT_SKILLS_DB = {
    "leadership", "communication", "teamwork", "collaboration", "problem-solving",
    "adaptability", "agile", "mentoring", "presentation", "ownership", "analytical"
}

JOBS_CATALOG = [
    {
        "id": 1,
        "title": "Software Engineering Intern (Backend & Python)",
        "company": "Razorpay",
        "platform": "LinkedIn",
        "location": "Bengaluru / Hybrid",
        "stipend": "₹45,000/month",
        "description": "Build scalable REST APIs in Python, FastAPI, SQL, PostgreSQL, Docker, Git, and microservices architecture.",
        "apply_url": "https://www.linkedin.com/jobs/"
    },
    {
        "id": 2,
        "title": "AI & Machine Learning Developer Intern",
        "company": "Swiggy",
        "platform": "Internshala",
        "location": "Remote",
        "stipend": "₹35,000/month",
        "description": "Develop NLP pipelines, scikit-learn recommendation models, Pandas data workflows, and LangChain LLM agents.",
        "apply_url": "https://internshala.com/internships/"
    },
    {
        "id": 3,
        "title": "Full-Stack Web Developer (Python + JS)",
        "company": "Zomato",
        "platform": "Indeed",
        "location": "Gurugram / Remote",
        "stipend": "₹40,000/month",
        "description": "Design responsive HTML, CSS, JavaScript frontends connected to FastAPI Python backends, SQL databases, and cloud CI/CD.",
        "apply_url": "https://in.indeed.com/"
    },
    {
        "id": 4,
        "title": "SDE-1 Campus Challenge & Hiring Track",
        "company": "Flipkart",
        "platform": "Unstop",
        "location": "Bengaluru",
        "stipend": "₹18 LPA CTC",
        "description": "Strong Data Structures, Algorithms, C++, Python, Object-Oriented Programming, system design, and problem-solving skills.",
        "apply_url": "https://unstop.com/"
    },
    {
        "id": 5,
        "title": "Data Analytics & Visualization Intern",
        "company": "Deloitte India",
        "platform": "LinkedIn",
        "location": "Kolkata / Hybrid",
        "stipend": "₹30,000/month",
        "description": "Analyze business datasets using Python, Pandas, SQL, Plotly dashboards, Excel, and analytical presentation skills.",
        "apply_url": "https://www.linkedin.com/jobs/"
    },
    {
        "id": 6,
        "title": "Cloud & DevOps Engineering Intern",
        "company": "Atlassian",
        "platform": "Unstop",
        "location": "Remote",
        "stipend": "₹60,000/month",
        "description": "Automate deployments with Docker, Kubernetes, AWS, Linux, Python scripting, GitHub Actions CI/CD, and monitoring.",
        "apply_url": "https://unstop.com/"
    },
    {
        "id": 7,
        "title": "Frontend & UI Engineering Intern",
        "company": "CRED",
        "platform": "Internshala",
        "location": "Bengaluru",
        "stipend": "₹50,000/month",
        "description": "Craft high-performance web interfaces with HTML5, modern CSS, JavaScript, REST API integration, and Figma.",
        "apply_url": "https://internshala.com/internships/"
    },
    {
        "id": 8,
        "title": "Associate Software Engineer",
        "company": "JPMorgan Chase & Co.",
        "platform": "Indeed",
        "location": "Mumbai / Bengaluru",
        "stipend": "₹14 LPA CTC",
        "description": "Build resilient financial applications with Python, Java, SQL, Git, agile teamwork, and automated testing.",
        "apply_url": "https://in.indeed.com/"
    }
]

def extract_keywords(text: str) -> set:
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}", text.lower())
    return {w for w in words if len(w) > 2 and w not in STOPWORDS}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Campus Connect FastAPI is running"}

@app.post("/api/auth/signup")
def signup(data: AuthRequest):
    try:
        res = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {"data": {"full_name": data.full_name or ""}}
        })
        return {"message": "Account created successfully", "user": res.user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
def login(data: AuthRequest):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        return {
            "access_token": res.session.access_token,
            "user": {"id": res.user.id, "email": res.user.email}
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid email or password")

@app.get("/api/auth/oauth/{provider}")
def oauth_login(provider: str, redirect_to: str = "http://127.0.0.1:8000/dashboard.html"):
    if provider not in ["google", "github"]:
        raise HTTPException(status_code=400, detail="Unsupported provider")
    res = supabase.auth.sign_in_with_oauth({
        "provider": provider,
        "options": {"redirect_to": redirect_to}
    })
    return {"url": res.url}

@app.get("/api/auth/me")
def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    try:
        user_res = supabase.auth.get_user(token)
        return {"user": {"id": user_res.user.id, "email": user_res.user.email}}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

@app.post("/api/ats/analyze")
async def analyze_ats(
    job_description: str = Form(...),
    resume_text: str = Form(""),
    resume_file: Optional[UploadFile] = File(None)
):
    extracted_text = resume_text.strip()

    if resume_file and resume_file.filename:
        content = await resume_file.read()
        if resume_file.filename.lower().endswith(".pdf"):
            reader = PdfReader(io.BytesIO(content))
            extracted_text = "\n".join(page.extract_text() or "" for page in reader.pages)
        else:
            extracted_text = content.decode("utf-8", errors="ignore")

    if len(extracted_text) < 30:
        raise HTTPException(status_code=400, detail="Please upload a valid PDF/TXT resume or paste resume text.")

    jd_keywords = extract_keywords(job_description)
    res_keywords = extract_keywords(extracted_text)

    if not jd_keywords:
        raise HTTPException(status_code=400, detail="Job description is too short to analyze.")

    matched = sorted(jd_keywords & res_keywords)
    missing = sorted(jd_keywords - res_keywords)

    missing_soft = [w for w in missing if w in SOFT_SKILLS_DB][:8]
    missing_hard = [w for w in missing if w not in SOFT_SKILLS_DB][:12]

    lower_res = extracted_text.lower()
    expected_sections = ["education", "experience", "skills", "projects"]
    found_sections = [s for s in expected_sections if s in lower_res]
    missing_sections = [s for s in expected_sections if s not in lower_res]

    keyword_score = (len(matched) / len(jd_keywords)) * 75
    section_score = (len(found_sections) / len(expected_sections)) * 25
    total_score = min(100, round(keyword_score + section_score))

    recommendations = []
    if missing_hard:
        recommendations.append(f"Add core technical keywords found in the JD: {', '.join(missing_hard[:5])}.")
    if missing_soft:
        recommendations.append(f"Demonstrate soft skills like: {', '.join(missing_soft[:4])} in project bullets.")
    if missing_sections:
        recommendations.append(f"Include clear standard headings for: {', '.join(s.title() for s in missing_sections)}.")
    if len(extracted_text.split()) < 150:
        recommendations.append("Your resume appears brief; quantify project achievements with metrics (%, latency, users).")
    if not recommendations:
        recommendations.append("Strong keyword alignment and section structure! Tailor your top summary line to the exact role title.")

    return {
        "ats_score": total_score,
        "matched_keywords": matched[:20],
        "missing_hard_keywords": missing_hard,
        "missing_soft_keywords": missing_soft,
        "found_sections": found_sections,
        "missing_sections": missing_sections,
        "recommendations": recommendations
    }

@app.post("/api/jobs/match")
def match_jobs(data: JobMatchRequest):
    filtered = JOBS_CATALOG
    if data.platform and data.platform != "All":
        filtered = [j for j in filtered if j["platform"].lower() == data.platform.lower()]

    if data.search_query.strip():
        q = data.search_query.lower().strip()
        filtered = [
            j for j in filtered
            if q in j["title"].lower() or q in j["company"].lower() or q in j["description"].lower()
        ]

    if not filtered:
        return {"jobs": []}

    candidate_doc = data.candidate_skills.strip() or "python sql git html css javascript"
    job_docs = [f"{j['title']} {j['description']}" for j in filtered]

    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
    tfidf_matrix = vectorizer.fit_transform([candidate_doc] + job_docs)
    similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()

    results = []
    for job, sim in zip(filtered, similarities):
        # Scale cosine similarity into an intuitive 0-100% match score
        match_pct = min(99, max(12, round(float(sim) * 220)))
        results.append({**job, "match_percentage": match_pct})

    results.sort(key=lambda x: x["match_percentage"], reverse=True)
    return {"jobs": results}

app.mount("/", StaticFiles(directory="public", html=True), name="public")