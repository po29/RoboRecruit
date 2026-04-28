"""
Fetch live job postings from Greenhouse, Lever, and LinkedIn.
Writes src/data/jobs.ts — run daily via GitHub Actions.
"""

import json
import re
import sys
import time
from datetime import date, datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
OUTPUT_FILE = REPO_ROOT / "src" / "data" / "jobs.ts"

TIMEOUT = 15  # seconds per request

# ── Company ATS configuration ──────────────────────────────────────────────

COMPANIES = [
    # Greenhouse (public JSON API — most reliable)
    {"id": "figure-ai",             "ats": "greenhouse", "token": "figureai"},
    {"id": "agility-robotics",      "ats": "greenhouse", "token": "agilityrobotics"},
    {"id": "apptronik",             "ats": "greenhouse", "token": "apptronik"},
    # LinkedIn search (no API key — falls back to seed data if blocked)
    {"id": "boston-dynamics",       "ats": "linkedin",   "name": "Boston Dynamics"},
    {"id": "skydio",                "ats": "linkedin",   "name": "Skydio"},
    {"id": "gecko-robotics",        "ats": "linkedin",   "name": "Gecko Robotics"},
    {"id": "intrinsic",             "ats": "linkedin",   "name": "Intrinsic"},
    {"id": "covariant",             "ats": "linkedin",   "name": "Covariant"},
    {"id": "physical-intelligence", "ats": "linkedin",   "name": "Physical Intelligence"},
    {"id": "machina-labs",          "ats": "linkedin",   "name": "Machina Labs"},
    {"id": "veo-robotics",          "ats": "linkedin",   "name": "Veo Robotics"},
]

SEED_FILE = SCRIPT_DIR / "seed_jobs.json"

# ── Skill keywords to extract from job title + description ─────────────────

SKILL_KEYWORDS = [
    "Python", "C++", "C#", "Go", "Rust", "Java", "TypeScript", "JavaScript",
    "MATLAB", "Simulink",
    "ROS 2", "ROS",
    "PyTorch", "JAX", "TensorFlow", "CUDA", "cuDNN",
    "Reinforcement Learning", "Imitation Learning", "Diffusion Models",
    "Large Language Models", "Computer Vision", "SLAM", "Depth Estimation",
    "Object Detection", "Neural Networks",
    "Control Theory", "LQR", "MPC", "Force Control", "Whole Body Control",
    "Motion Planning", "Kinematics",
    "Gazebo", "MuJoCo", "Isaac Sim", "Isaac Lab",
    "AWS", "Google Cloud", "Azure",
    "Docker", "Kubernetes", "CI/CD", "Terraform",
    "gRPC", "Protobuf", "PostgreSQL", "Redis",
    "OpenCV", "PCL", "3D Sensing", "Ultrasonic NDT",
    "Embedded Systems", "Real-time Systems", "EtherCAT", "CAN Bus",
    "Linux", "RTOS",
    "Safety PLC", "Functional Safety",
]

# Sort longest first so "ROS 2" matches before "ROS"
SKILL_KEYWORDS.sort(key=len, reverse=True)

# ── Level inference from job title ────────────────────────────────────────

LEVEL_PATTERNS = [
    (r"\bintern\b",                          "Intern"),
    (r"\bjunior\b|\bassociate\b|\bentry\b",  "Junior"),
    (r"\bstaff\b",                           "Staff"),
    (r"\bprincipal\b|\bdistinguished\b",     "Principal"),
    (r"\blead\b",                            "Lead"),
    (r"\bdirector\b|\bmanager\b|\bhead\b",   "Manager"),
    (r"\bsenior\b|\bsr\.?\b",               "Senior"),
]

VALID_LEVELS = {"Intern", "Junior", "Mid", "Senior", "Staff", "Principal", "Lead", "Manager"}


def infer_level(title: str) -> str:
    t = title.lower()
    for pattern, level in LEVEL_PATTERNS:
        if re.search(pattern, t):
            return level
    return "Mid"


def extract_skills(text: str) -> list[str]:
    """Return skill names that appear in text (case-insensitive, word-boundary aware)."""
    found = []
    seen = set()
    lower = text.lower()
    for skill in SKILL_KEYWORDS:
        key = skill.lower()
        if key in seen:
            continue
        idx = lower.find(key)
        if idx == -1:
            continue
        before = lower[idx - 1] if idx > 0 else " "
        after = lower[idx + len(key)] if idx + len(key) < len(lower) else " "
        if before.isalnum() or after.isalnum():
            continue
        found.append(skill)
        seen.add(key)
    return found


def normalize_location(raw: str) -> tuple[str, bool]:
    """Return (location_str, is_remote)."""
    if not raw:
        return ("Remote", True)
    low = raw.lower()
    is_remote = "remote" in low
    clean = re.sub(r"<[^>]+>", "", raw).strip()
    clean = re.sub(r"\s+", " ", clean)
    return (clean or "Remote", is_remote)


def today_iso() -> str:
    return date.today().isoformat()


def parse_greenhouse_date(ts) -> str:
    if not ts:
        return today_iso()
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).date().isoformat()
    except Exception:
        return today_iso()


def parse_lever_date(ts) -> str:
    if not ts:
        return today_iso()
    try:
        return datetime.fromtimestamp(int(ts) / 1000).date().isoformat()
    except Exception:
        return today_iso()


# ── ATS fetchers ──────────────────────────────────────────────────────────

def fetch_greenhouse(company_id: str, token: str) -> list[dict]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"
    try:
        resp = requests.get(url, timeout=TIMEOUT)
        resp.raise_for_status()
    except Exception as e:
        print(f"  ✗ Greenhouse {token}: {e}", file=sys.stderr)
        return []

    data = resp.json()
    jobs = []
    for raw in data.get("jobs", []):
        title = raw.get("title", "")
        desc_html = raw.get("content", "") or ""
        desc_text = re.sub(r"<[^>]+>", " ", desc_html)
        search_text = f"{title} {desc_text}"

        location_raw = raw.get("location", {}).get("name", "")
        location, remote = normalize_location(location_raw)

        job_id = str(raw.get("id", ""))
        apply_url = raw.get("absolute_url", f"https://boards.greenhouse.io/{token}/jobs/{job_id}")

        jobs.append({
            "id": f"{company_id}-{job_id}",
            "companyId": company_id,
            "title": title,
            "level": infer_level(title),
            "skills": extract_skills(search_text),
            "location": location,
            "remote": remote,
            "postedDate": parse_greenhouse_date(raw.get("updated_at") or raw.get("created_at")),
            "url": apply_url,
        })
    print(f"  ✓ Greenhouse {token}: {len(jobs)} jobs")
    return jobs


def fetch_lever(company_id: str, token: str) -> list[dict]:
    url = f"https://api.lever.co/v0/postings/{token}?mode=json"
    try:
        resp = requests.get(url, timeout=TIMEOUT)
        resp.raise_for_status()
    except Exception as e:
        print(f"  ✗ Lever {token}: {e}", file=sys.stderr)
        return []

    jobs = []
    for raw in resp.json():
        title = raw.get("text", "")
        desc_text = raw.get("descriptionPlain", "") or ""
        lists_text = " ".join(
            item.get("content", "")
            for lst in raw.get("lists", [])
            for item in (lst.get("content") if isinstance(lst.get("content"), list) else [])
            if isinstance(item, dict)
        )
        search_text = f"{title} {desc_text} {lists_text}"

        location_raw = raw.get("categories", {}).get("location", "") or raw.get("workplaceType", "")
        location, remote = normalize_location(location_raw)

        posting_id = raw.get("id", "")
        apply_url = raw.get("applyUrl") or raw.get("hostedUrl") or f"https://jobs.lever.co/{token}/{posting_id}"

        jobs.append({
            "id": f"{company_id}-{posting_id}",
            "companyId": company_id,
            "title": title,
            "level": infer_level(title),
            "skills": extract_skills(search_text),
            "location": location,
            "remote": remote,
            "postedDate": parse_lever_date(raw.get("createdAt")),
            "url": apply_url,
        })
    print(f"  ✓ Lever {token}: {len(jobs)} jobs")
    return jobs


# LinkedIn guest search — no API key required.
# LinkedIn may block cloud IPs; if so, this returns [] and seed data is used.
LINKEDIN_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def fetch_linkedin(company_id: str, company_name: str) -> list[dict]:
    """Search LinkedIn guest job search for a company. Falls back gracefully on block."""
    time.sleep(3)  # rate limit between requests

    try:
        resp = requests.get(
            "https://www.linkedin.com/jobs/search/",
            params={
                "keywords": company_name,
                "location": "United States",
                "f_TPR": "r2592000",  # past 30 days
                "position": 1,
                "pageNum": 0,
            },
            headers=LINKEDIN_HEADERS,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
    except Exception as e:
        print(f"  ✗ LinkedIn {company_name}: {e}", file=sys.stderr)
        return []

    # Detect auth wall redirect
    if any(x in resp.url for x in ("authwall", "/login", "/checkpoint")):
        print(f"  ✗ LinkedIn {company_name}: auth wall — seed fallback will be used", file=sys.stderr)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")

    # Try both known card selectors (LinkedIn changes HTML periodically)
    cards = soup.select("div.base-card") or soup.select("li.jobs-search__results-list > div")

    if not cards:
        print(f"  ✗ LinkedIn {company_name}: no job cards found (HTML structure may have changed)", file=sys.stderr)
        return []

    jobs = []
    for card in cards:
        title_el    = card.select_one("h3.base-search-card__title")
        company_el  = card.select_one("h4.base-search-card__subtitle")
        location_el = card.select_one("span.job-search-card__location")
        link_el     = card.select_one("a.base-card__full-link")
        time_el     = card.select_one("time")

        if not title_el or not link_el:
            continue

        # Skip postings not actually from this company
        listed_company = company_el.get_text(strip=True) if company_el else ""
        if company_name.lower() not in listed_company.lower():
            continue

        title        = title_el.get_text(strip=True)
        location_raw = location_el.get_text(strip=True) if location_el else ""
        location, remote = normalize_location(location_raw)
        href         = link_el.get("href", "")
        url_clean    = href.split("?")[0]  # strip tracking params
        posted       = time_el.get("datetime", today_iso()) if time_el else today_iso()
        job_slug     = url_clean.rstrip("/").split("-")[-1]

        jobs.append({
            "id":         f"{company_id}-li-{job_slug}",
            "companyId":  company_id,
            "title":      title,
            "level":      infer_level(title),
            "skills":     extract_skills(title),
            "location":   location,
            "remote":     remote,
            "postedDate": posted,
            "url":        url_clean,
        })

    print(f"  ✓ LinkedIn {company_name}: {len(jobs)} jobs")
    return jobs


# ── TypeScript output ──────────────────────────────────────────────────────

TS_HEADER = """\
// AUTO-GENERATED by scripts/fetch_jobs.py — do not edit manually.
// Last updated: {date}

import {{ Job, JobLevel }} from '../types'

export const jobs: Job[] = [
"""

TS_FOOTER = "]\n"


def job_to_ts(j: dict) -> str:
    skills = json.dumps(j["skills"])
    remote = "true" if j["remote"] else "false"
    level = j["level"] if j["level"] in VALID_LEVELS else "Mid"
    return (
        f"  {{\n"
        f"    id: {json.dumps(j['id'])},\n"
        f"    companyId: {json.dumps(j['companyId'])},\n"
        f"    title: {json.dumps(j['title'])},\n"
        f"    level: JobLevel.{level},\n"
        f"    skills: {skills},\n"
        f"    location: {json.dumps(j['location'])},\n"
        f"    remote: {remote},\n"
        f"    postedDate: {json.dumps(j['postedDate'])},\n"
        f"    url: {json.dumps(j['url'])},\n"
        f"  }}"
    )


def write_ts(jobs: list[dict]) -> None:
    entries = ",\n".join(job_to_ts(j) for j in jobs)
    content = TS_HEADER.format(date=today_iso()) + entries + "\n" + TS_FOOTER
    OUTPUT_FILE.write_text(content, encoding="utf-8")
    print(f"\nWrote {len(jobs)} jobs → {OUTPUT_FILE.relative_to(REPO_ROOT)}")


# ── Main ──────────────────────────────────────────────────────────────────

def main():
    seed_jobs: list[dict] = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    live_company_ids: set[str] = set()
    live_jobs: list[dict] = []

    for company in COMPANIES:
        cid = company["id"]
        ats = company["ats"]
        print(f"\n{cid}")

        fetched: list[dict] = []
        if ats == "greenhouse":
            fetched = fetch_greenhouse(cid, company["token"])
        elif ats == "lever":
            fetched = fetch_lever(cid, company["token"])
        elif ats == "linkedin":
            fetched = fetch_linkedin(cid, company["name"])

        if fetched:
            live_jobs.extend(fetched)
            live_company_ids.add(cid)

    seed_fallback = [j for j in seed_jobs if j["companyId"] not in live_company_ids]
    if seed_fallback:
        companies_using_seed = {j["companyId"] for j in seed_fallback}
        print(f"\nUsing seed data for: {', '.join(sorted(companies_using_seed))}")

    all_jobs = live_jobs + seed_fallback

    if not all_jobs:
        print("No jobs fetched — aborting to avoid overwriting with empty file.", file=sys.stderr)
        sys.exit(1)

    write_ts(all_jobs)


if __name__ == "__main__":
    main()
