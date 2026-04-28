"""
Fetch live job postings from Greenhouse and Lever ATS APIs.
Writes src/data/jobs.ts — run daily via GitHub Actions.
"""

import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

import requests

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
OUTPUT_FILE = REPO_ROOT / "src" / "data" / "jobs.ts"

TIMEOUT = 10  # seconds per request

# ── Company ATS configuration ──────────────────────────────────────────────

COMPANIES = [
    # Verified working ATS boards:
    {"id": "figure-ai",        "ats": "greenhouse", "token": "figureai"},
    {"id": "agility-robotics", "ats": "greenhouse", "token": "agilityrobotics"},
    {"id": "apptronik",        "ats": "greenhouse", "token": "apptronik"},
    # All others fall back to seed_jobs.json (no public ATS board found):
    # boston-dynamics, 1x-technologies, sanctuary-ai, unitree-robotics,
    # skydio, gecko-robotics, intrinsic, covariant, physical-intelligence,
    # machina-labs, veo-robotics
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
        # Word-boundary check: skill must not be surrounded by alphanumerics
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
    # Strip HTML tags if any
    clean = re.sub(r"<[^>]+>", "", raw).strip()
    # Collapse whitespace
    clean = re.sub(r"\s+", " ", clean)
    return (clean or "Remote", is_remote)


def today_iso() -> str:
    return date.today().isoformat()


def parse_greenhouse_date(ts) -> str:
    if not ts:
        return today_iso()
    try:
        # Greenhouse returns ISO 8601: "2026-04-01T00:00:00.000Z"
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).date().isoformat()
    except Exception:
        return today_iso()


def parse_lever_date(ts) -> str:
    if not ts:
        return today_iso()
    try:
        # Lever returns Unix ms timestamp
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
        # Combine title + stripped HTML description for skill extraction
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

        # Lever location
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
    # Load seed jobs (fallback for companies without a public ATS board)
    seed_jobs: list[dict] = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    live_company_ids: set[str] = set()

    live_jobs: list[dict] = []
    for company in COMPANIES:
        cid = company["id"]
        ats = company["ats"]
        token = company["token"]
        print(f"\n{cid}")

        fetched: list[dict] = []
        if ats == "greenhouse":
            fetched = fetch_greenhouse(cid, token)
        elif ats == "lever":
            fetched = fetch_lever(cid, token)

        if fetched:
            live_jobs.extend(fetched)
            live_company_ids.add(cid)

    # Seed jobs for any company that wasn't fetched live
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
