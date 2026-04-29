"""
Discover new US robotics companies from LinkedIn job postings.
Enriches each entry with Claude API (website analysis) and real ATS job listings.
Accumulates results in discovered_cache.json and regenerates:
  src/data/discoveredCompanies.ts
  src/data/discoveredJobs.ts
Run daily via GitHub Actions.
"""

import json
import os
import re
import sys
import time
from collections import Counter
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT   = SCRIPT_DIR.parent
CURATED_FILE  = REPO_ROOT / "src" / "data" / "companies.ts"
OUTPUT_FILE   = REPO_ROOT / "src" / "data" / "discoveredCompanies.ts"
JOBS_FILE     = REPO_ROOT / "src" / "data" / "discoveredJobs.ts"
CACHE_FILE    = SCRIPT_DIR / "discovered_cache.json"

TIMEOUT = 15
MIN_JOBS_FOR_INCLUSION = 2

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

SEARCH_QUERIES = [
    "ROS 2 robotics software engineer",
    "humanoid robot software engineer",
    "robot learning controls engineer",
    "autonomous systems robotics engineer",
    "embedded systems robotics United States",
]

# ── Domain inference ──────────────────────────────────────────────────────

DOMAIN_SIGNALS: list[tuple[str, list[str]]] = [
    ("ProblemDomain.HumanoidRobotics",    ["humanoid", "bipedal", "biped", "walking robot", "legged robot"]),
    ("ProblemDomain.MobileManipulation",  ["manipulation", "grasping", "pick-and-place", "dexterous", "robotic arm"]),
    ("ProblemDomain.AutonomousNav",       ["autonomous navigation", "path planning", "SLAM", "lidar", "self-driving"]),
    ("ProblemDomain.DroneUAV",            ["drone", "UAV", "aerial", "unmanned aerial"]),
    ("ProblemDomain.InspectionSensing",   ["inspection", "NDT", "non-destructive", "asset integrity"]),
    ("ProblemDomain.ManufacturingAuto",   ["manufacturing", "factory", "industrial robot", "welding"]),
    ("ProblemDomain.RoboticsFoundation",  ["foundation model", "robot platform", "middleware", "robot SDK"]),
    ("ProblemDomain.EmbodiedAI",          ["embodied AI", "robot learning", "imitation learning", "policy learning"]),
    ("ProblemDomain.SafetyCollaboration", ["safety", "cobot", "collaborative robot", "human-robot"]),
]

VALID_DOMAINS = {d for d, _ in DOMAIN_SIGNALS}
VALID_DOMAINS_READABLE = {
    "HumanoidRobotics":    "Humanoid Robotics",
    "MobileManipulation":  "Mobile Manipulation",
    "AutonomousNav":       "Autonomous Navigation",
    "DroneUAV":            "Drone / UAV",
    "InspectionSensing":   "Inspection & Sensing",
    "ManufacturingAuto":   "Manufacturing Automation",
    "RoboticsFoundation":  "Robotics Foundation / AI",
    "EmbodiedAI":          "Embodied AI",
    "SafetyCollaboration": "Safety & Collaboration",
}

# ── Skill extraction ──────────────────────────────────────────────────────

SKILL_TO_CATEGORY: dict[str, str] = {
    "Python": "TechCategory.Language",
    "C++": "TechCategory.Language",
    "Rust": "TechCategory.Language",
    "Go": "TechCategory.Language",
    "Java": "TechCategory.Language",
    "MATLAB": "TechCategory.Controls",
    "Simulink": "TechCategory.Controls",
    "ROS 2": "TechCategory.RoboticsOS",
    "ROS": "TechCategory.RoboticsOS",
    "PyTorch": "TechCategory.ML",
    "JAX": "TechCategory.ML",
    "TensorFlow": "TechCategory.ML",
    "CUDA": "TechCategory.ML",
    "Reinforcement Learning": "TechCategory.ML",
    "Computer Vision": "TechCategory.Perception",
    "SLAM": "TechCategory.Perception",
    "OpenCV": "TechCategory.Perception",
    "Control Theory": "TechCategory.Controls",
    "LQR": "TechCategory.Controls",
    "MPC": "TechCategory.Controls",
    "Gazebo": "TechCategory.Simulation",
    "MuJoCo": "TechCategory.Simulation",
    "Isaac Sim": "TechCategory.Simulation",
    "AWS": "TechCategory.Cloud",
    "Google Cloud": "TechCategory.Cloud",
    "Azure": "TechCategory.Cloud",
    "Docker": "TechCategory.DevOps",
    "Kubernetes": "TechCategory.DevOps",
    "Linux": "TechCategory.Language",
    "Embedded Systems": "TechCategory.Hardware",
    "EtherCAT": "TechCategory.Hardware",
    "CAN Bus": "TechCategory.Hardware",
}

SKILL_KEYWORDS = sorted(SKILL_TO_CATEGORY.keys(), key=len, reverse=True)

JOB_LEVELS = {
    "intern": "Intern",
    "junior": "Junior", "associate": "Junior",
    "staff": "Staff",
    "principal": "Principal",
    "lead": "Lead",
    "senior": "Senior", "sr.": "Senior",
    "director": "Manager", "manager": "Manager",
}

US_SIGNALS = [
    ", CA", ", TX", ", NY", ", WA", ", MA", ", OR", ", PA", ", GA",
    ", CO", ", AZ", ", FL", ", NC", ", VA", ", IL", ", OH", ", MI",
    "United States", "Remote",
]

LINKEDIN_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

# ── Helpers ───────────────────────────────────────────────────────────────

def today_iso() -> str:
    return date.today().isoformat()


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def infer_level(title: str) -> str:
    t = title.lower()
    for kw, level in JOB_LEVELS.items():
        if kw in t:
            return level
    return "Mid"


def extract_skills(text: str) -> list[str]:
    found, seen = [], set()
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


def infer_domains(texts: list[str]) -> list[str]:
    combined = " ".join(texts).lower()
    domains = [d for d, kws in DOMAIN_SIGNALS if any(kw.lower() in combined for kw in kws)]
    return domains or ["ProblemDomain.RoboticsFoundation"]


def is_us_location(location: str) -> bool:
    return any(sig in location for sig in US_SIGNALS) or location == ""


def get_curated_names() -> set[str]:
    if not CURATED_FILE.exists():
        return set()
    content = CURATED_FILE.read_text()
    return {m.group(1).lower() for m in re.finditer(r"name:\s*['\"]([^'\"]+)['\"]", content)}


# ── Website discovery ─────────────────────────────────────────────────────

SKIP_DOMAINS = {"linkedin.com", "wikipedia.org", "crunchbase.com", "twitter.com",
                "glassdoor.com", "facebook.com", "youtube.com", "instagram.com",
                "bloomberg.com", "techcrunch.com", "reuters.com", "forbes.com"}


def _is_valid_website(url: str) -> bool:
    if not url or not url.startswith("http"):
        return False
    for d in SKIP_DOMAINS:
        if d in url:
            return False
    return True


def find_website(name: str) -> str:
    """Search DuckDuckGo for the company's official website."""
    time.sleep(2)
    try:
        r = requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": f'"{name}" robotics official site'},
            headers={**LINKEDIN_HEADERS, "Referer": "https://duckduckgo.com/"},
            timeout=TIMEOUT,
        )
        soup = BeautifulSoup(r.text, "html.parser")
        for a in soup.select("a.result__url, a.result__a"):
            href = a.get("href", "")
            # DuckDuckGo wraps URLs — extract from redirect
            m = re.search(r"uddg=([^&]+)", href)
            if m:
                href = requests.utils.unquote(m.group(1))
            if _is_valid_website(href):
                return href.split("?")[0].rstrip("/")
    except Exception:
        pass
    return ""


def fetch_page_text(url: str) -> str:
    """Fetch a URL and return stripped text (max 6000 chars)."""
    try:
        r = requests.get(url, headers=LINKEDIN_HEADERS, timeout=TIMEOUT)
        html = r.text
        html = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.I)
        html = re.sub(r"<style[\s\S]*?</style>", "", html, flags=re.I)
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:6000]
    except Exception:
        return ""


# ── Claude API enrichment ─────────────────────────────────────────────────

PROBLEM_DOMAIN_VALUES = ", ".join(VALID_DOMAINS_READABLE.values())
TECH_CATEGORIES = "Language, Framework, Robotics OS, ML / AI, Simulation, Cloud, Hardware, Perception, Controls, DevOps"

CLAUDE_PROMPT = """You are analyzing a robotics company's website. Extract structured info and respond with ONLY valid JSON (no markdown, no explanation).

Company name: {name}
Website text (truncated):
---
{text}
---

Return this exact JSON shape:
{{
  "description": "2-3 sentence company description",
  "hq": "City, State (US) or City, Country",
  "logo": "absolute URL to the company logo if clearly present in the text, else empty string",
  "problems": ["pick exact values from: {domains}"],
  "techStack": [{{"name": "technology name", "category": "pick exact value from: {categories}"}}],
  "products": [{{"name": "product name", "description": "one sentence", "category": "Hardware|Software|Platform|Service"}}]
}}

Rules:
- problems must be exact strings from the allowed list
- techStack category must be exact strings from the allowed list
- Include only technologies clearly mentioned on the site
- Return at most 3 products
- If a field is unknown use empty string or empty array"""


def claude_enrich(name: str, page_text: str) -> dict:
    if not ANTHROPIC_API_KEY or not page_text:
        return {}
    prompt = CLAUDE_PROMPT.format(
        name=name,
        text=page_text,
        domains=PROBLEM_DOMAIN_VALUES,
        categories=TECH_CATEGORIES,
    )
    try:
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-opus-4-7",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        r.raise_for_status()
        text = r.json()["content"][0]["text"]
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            return {}
        raw = json.loads(m.group(0))

        valid_domains_set = set(VALID_DOMAINS_READABLE.values())
        valid_cats = {"Language", "Framework", "Robotics OS", "ML / AI", "Simulation",
                      "Cloud", "Hardware", "Perception", "Controls", "DevOps"}

        # Map readable domain values back to ProblemDomain enum keys
        domain_reverse = {v: k for k, v in VALID_DOMAINS_READABLE.items()}
        problems = []
        for d in raw.get("problems", []):
            if d in valid_domains_set:
                problems.append(f"ProblemDomain.{domain_reverse[d]}")

        # Map category strings to TechCategory enum keys
        cat_map = {
            "Language": "TechCategory.Language",
            "Framework": "TechCategory.Framework",
            "Robotics OS": "TechCategory.RoboticsOS",
            "ML / AI": "TechCategory.ML",
            "Simulation": "TechCategory.Simulation",
            "Cloud": "TechCategory.Cloud",
            "Hardware": "TechCategory.Hardware",
            "Perception": "TechCategory.Perception",
            "Controls": "TechCategory.Controls",
            "DevOps": "TechCategory.DevOps",
        }

        tech = []
        for t in raw.get("techStack", []):
            cat = cat_map.get(t.get("category", ""))
            if cat and t.get("name"):
                tech.append({"name": t["name"], "category": cat})

        products = []
        for p in raw.get("products", [])[:3]:
            if p.get("name"):
                products.append({
                    "name": p["name"],
                    "description": p.get("description", ""),
                    "category": p.get("category", "Software"),
                })

        return {
            "description": raw.get("description", ""),
            "hq": raw.get("hq", ""),
            "logo": raw.get("logo", ""),
            "problems": problems,
            "techStack": tech,
            "products": products,
        }
    except Exception as e:
        print(f"    Claude error: {e}", file=sys.stderr)
        return {}


# ── ATS job fetching ──────────────────────────────────────────────────────

def _slug_candidates(name: str) -> list[str]:
    base = re.sub(r"[^a-z0-9]", "", name.lower())
    dash = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    variants = {base, dash, base.replace("robotics", ""), base.replace("ai", "")}
    return [v for v in variants if v]


def _fetch_greenhouse(slug: str, company_id: str) -> list[dict]:
    try:
        r = requests.get(
            f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs",
            timeout=TIMEOUT,
        )
        if not r.ok:
            return []
        jobs = r.json().get("jobs", [])
        result = []
        for j in jobs:
            result.append({
                "id": f"gh-{j['id']}",
                "companyId": company_id,
                "title": str(j.get("title", "")),
                "level": infer_level(str(j.get("title", ""))),
                "skills": [],
                "location": str((j.get("location") or {}).get("name", "")),
                "remote": "remote" in str((j.get("location") or {}).get("name", "")).lower(),
                "postedDate": str(j.get("updated_at", ""))[:10] or today_iso(),
                "url": str(j.get("absolute_url", "")),
            })
        return result
    except Exception:
        return []


def _fetch_lever(slug: str, company_id: str) -> list[dict]:
    try:
        r = requests.get(
            f"https://api.lever.co/v0/postings/{slug}?mode=json",
            timeout=TIMEOUT,
        )
        if not r.ok:
            return []
        result = []
        for j in r.json():
            result.append({
                "id": f"lv-{j['id']}",
                "companyId": company_id,
                "title": str(j.get("text", "")),
                "level": infer_level(str(j.get("text", ""))),
                "skills": [],
                "location": str((j.get("categories") or {}).get("location", "")),
                "remote": str(j.get("workplaceType", "")).lower() == "remote",
                "postedDate": (
                    date.fromtimestamp(j["createdAt"] / 1000).isoformat()
                    if j.get("createdAt") else today_iso()
                ),
                "url": str(j.get("hostedUrl") or j.get("applyUrl", "")),
            })
        return result
    except Exception:
        return []


def _fetch_ashby(slug: str, company_id: str) -> list[dict]:
    try:
        r = requests.get(
            f"https://api.ashbyhq.com/posting-api/job-board/{slug}",
            timeout=TIMEOUT,
        )
        if not r.ok:
            return []
        result = []
        for i, j in enumerate(r.json().get("jobPostings", [])):
            result.append({
                "id": f"ash-{j.get('id', i)}",
                "companyId": company_id,
                "title": str(j.get("title", "")),
                "level": infer_level(str(j.get("title", ""))),
                "skills": [],
                "location": str((j.get("location") or {}).get("city", "") or j.get("locationName", "")),
                "remote": "remote" in str(j.get("locationName", "")).lower(),
                "postedDate": str(j.get("publishedDate", ""))[:10] or today_iso(),
                "url": str(j.get("jobUrl", "")),
            })
        return result
    except Exception:
        return []


def try_ats_jobs(name: str, company_id: str) -> list[dict]:
    for slug in _slug_candidates(name):
        jobs = _fetch_greenhouse(slug, company_id)
        if jobs:
            print(f"    ATS: Greenhouse/{slug} → {len(jobs)} jobs")
            return jobs
        jobs = _fetch_lever(slug, company_id)
        if jobs:
            print(f"    ATS: Lever/{slug} → {len(jobs)} jobs")
            return jobs
        jobs = _fetch_ashby(slug, company_id)
        if jobs:
            print(f"    ATS: Ashby/{slug} → {len(jobs)} jobs")
            return jobs
    return []


# ── Entry enrichment ──────────────────────────────────────────────────────

def needs_enrichment(entry: dict) -> bool:
    return (
        not entry.get("website")
        or not entry.get("products")
        or entry.get("description", "").startswith("Auto-discovered")
    )


def enrich_entry(entry: dict) -> dict:
    name = entry["name"]
    company_id = entry["id"]
    print(f"  Enriching: {name}")

    # 1. Find website
    if not entry.get("website"):
        website = find_website(name)
        if website:
            entry["website"] = website
            print(f"    Website: {website}")
        else:
            print(f"    Website: not found")

    # 2. Claude analysis
    if entry.get("website") and (not entry.get("products") or entry.get("description", "").startswith("Auto-discovered")):
        page_text = fetch_page_text(entry["website"])
        if page_text:
            enriched = claude_enrich(name, page_text)
            if enriched:
                if enriched.get("description"):
                    entry["description"] = enriched["description"]
                if enriched.get("hq"):
                    entry["hq"] = enriched["hq"]
                if enriched.get("logo"):
                    entry["logo"] = enriched["logo"]
                if enriched.get("problems"):
                    entry["problems"] = enriched["problems"]
                if enriched.get("techStack"):
                    entry["techStack"] = enriched["techStack"]
                if enriched.get("products"):
                    entry["products"] = enriched["products"]
                print(f"    Claude: {len(enriched.get('products', []))} products, {len(enriched.get('problems', []))} domains")

    # 3. ATS jobs
    if not entry.get("jobs"):
        jobs = try_ats_jobs(name, company_id)
        if jobs:
            entry["jobs"] = jobs
            entry["jobCount"] = len(jobs)
        else:
            entry.setdefault("jobs", [])

    entry["enriched"] = True
    return entry


# ── LinkedIn search ────────────────────────────────────────────────────────

def linkedin_search(query: str) -> list[dict]:
    time.sleep(3)
    try:
        resp = requests.get(
            "https://www.linkedin.com/jobs/search/",
            params={
                "keywords": query,
                "location": "United States",
                "f_TPR": "r2592000",
                "position": 1,
                "pageNum": 0,
            },
            headers=LINKEDIN_HEADERS,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
    except Exception as e:
        print(f"  ✗ search '{query}': {e}", file=sys.stderr)
        return []

    if any(x in resp.url for x in ("authwall", "/login", "/checkpoint")):
        print(f"  ✗ search '{query}': LinkedIn auth wall", file=sys.stderr)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    cards = soup.select("div.base-card") or soup.select("li.jobs-search__results-list > div")

    if not cards:
        print(f"  ✗ search '{query}': no cards", file=sys.stderr)
        return []

    results = []
    for card in cards:
        title_el    = card.select_one("h3.base-search-card__title")
        company_el  = card.select_one("h4.base-search-card__subtitle")
        location_el = card.select_one("span.job-search-card__location")
        if not title_el or not company_el:
            continue
        location = location_el.get_text(strip=True) if location_el else ""
        if not is_us_location(location):
            continue
        results.append({
            "title":    title_el.get_text(strip=True),
            "company":  company_el.get_text(strip=True),
            "location": location,
        })

    print(f"  ✓ '{query}': {len(results)} results")
    return results


# ── Entry builder (pre-enrichment) ────────────────────────────────────────

def build_entry(name: str, jobs: list[dict]) -> dict:
    all_titles = [j["title"] for j in jobs]
    combined   = " ".join(all_titles)

    non_remote = [j["location"] for j in jobs if "remote" not in j["location"].lower()]
    hq = Counter(non_remote).most_common(1)[0][0] if non_remote else "United States"

    skills    = extract_skills(combined)
    tech_stack = [{"name": s, "category": SKILL_TO_CATEGORY[s]} for s in skills if s in SKILL_TO_CATEGORY]
    domains   = infer_domains(all_titles)

    domain_readable = (
        ", ".join(d.split(".")[1] for d in domains)
        .replace("HumanoidRobotics", "humanoid robotics")
        .replace("MobileManipulation", "mobile manipulation")
        .replace("AutonomousNav", "autonomous navigation")
        .replace("DroneUAV", "drone / UAV")
        .replace("InspectionSensing", "inspection & sensing")
        .replace("ManufacturingAuto", "manufacturing automation")
        .replace("RoboticsFoundation", "robotics / AI platform")
        .replace("EmbodiedAI", "embodied AI")
        .replace("SafetyCollaboration", "safety & collaboration")
    )

    return {
        "id":             slugify(name),
        "name":           name,
        "logo":           "",
        "website":        "",
        "hq":             hq,
        "stage":          "CompanyStage.SeriesA",
        "problems":       domains,
        "techStack":      tech_stack,
        "products":       [],
        "jobs":           [],
        "description":    (
            f"Auto-discovered US robotics company working in {domain_readable}. "
            f"Based in {hq}. Profile built from live job postings — visit their "
            f"website for full details."
        ),
        "jobCount":       len(jobs),
        "discoveredDate": today_iso(),
        "enriched":       False,
    }


# ── TypeScript output ─────────────────────────────────────────────────────

def entry_to_ts(c: dict) -> str:
    problems_ts = ", ".join(c["problems"])
    tech_ts = ", ".join(
        f"{{ name: {json.dumps(t['name'])}, category: {t['category']} }}"
        for t in c["techStack"]
    )
    products_ts = ", ".join(
        f"{{ name: {json.dumps(p['name'])}, description: {json.dumps(p['description'])}, category: {json.dumps(p['category'])} }}"
        for p in c.get("products", [])
    )
    return (
        f"  {{\n"
        f"    id: {json.dumps(c['id'])},\n"
        f"    name: {json.dumps(c['name'])},\n"
        f"    logo: {json.dumps(c.get('logo', ''))},\n"
        f"    website: {json.dumps(c.get('website', ''))},\n"
        f"    hq: {json.dumps(c['hq'])},\n"
        f"    stage: {c['stage']},\n"
        f"    problems: [{problems_ts}],\n"
        f"    techStack: [{tech_ts}],\n"
        f"    products: [{products_ts}],\n"
        f"    description: {json.dumps(c['description'])},\n"
        f"    jobCount: {c['jobCount']},\n"
        f"    discovered: true,\n"
        f"  }}"
    )


def job_to_ts(j: dict) -> str:
    return (
        f"    {{\n"
        f"      id: {json.dumps(j['id'])},\n"
        f"      companyId: {json.dumps(j['companyId'])},\n"
        f"      title: {json.dumps(j['title'])},\n"
        f"      level: JobLevel.{j['level']},\n"
        f"      skills: [],\n"
        f"      location: {json.dumps(j['location'])},\n"
        f"      remote: {'true' if j['remote'] else 'false'},\n"
        f"      postedDate: {json.dumps(j['postedDate'])},\n"
        f"      url: {json.dumps(j['url'])},\n"
        f"    }}"
    )


def write_ts(companies: list[dict]) -> None:
    entries = ",\n".join(entry_to_ts(c) for c in companies) if companies else ""
    suppress = "" if companies else "\nvoid CompanyStage\nvoid ProblemDomain\nvoid TechCategory\n"
    content = (
        f"// AUTO-GENERATED by scripts/discover_companies.py — do not edit manually.\n"
        f"// Last updated: {today_iso()}\n\n"
        f"import {{ Company, CompanyStage, ProblemDomain, TechCategory }} from '../types'\n"
        f"{suppress}\n"
        f"export const discoveredCompanies: Company[] = [\n"
        f"{entries + chr(10) if entries else ''}"
        f"]\n"
    )
    OUTPUT_FILE.write_text(content, encoding="utf-8")
    print(f"Wrote {len(companies)} discovered companies → {OUTPUT_FILE.relative_to(REPO_ROOT)}")


def write_jobs_ts(companies: list[dict]) -> None:
    entries_by_company = {
        c["id"]: c.get("jobs", [])
        for c in companies
        if c.get("jobs")
    }

    if entries_by_company:
        map_entries = []
        for company_id, jobs in entries_by_company.items():
            jobs_ts = ",\n".join(job_to_ts(j) for j in jobs)
            map_entries.append(f"  {json.dumps(company_id)}: [\n{jobs_ts}\n  ]")
        body = ",\n".join(map_entries)
        content = (
            f"// AUTO-GENERATED by scripts/discover_companies.py — do not edit manually.\n"
            f"// Last updated: {today_iso()}\n\n"
            f"import {{ Job, JobLevel }} from '../types'\n\n"
            f"export const discoveredJobsByCompany: Record<string, Job[]> = {{\n"
            f"{body}\n"
            f"}}\n"
        )
    else:
        content = (
            f"// AUTO-GENERATED by scripts/discover_companies.py — do not edit manually.\n"
            f"// Last updated: {today_iso()}\n\n"
            f"import {{ Job }} from '../types'\n\n"
            f"export const discoveredJobsByCompany: Record<string, Job[]> = {{}}\n"
        )

    JOBS_FILE.write_text(content, encoding="utf-8")
    total = sum(len(j) for j in entries_by_company.values())
    print(f"Wrote {total} discovered jobs → {JOBS_FILE.relative_to(REPO_ROOT)}")


# ── Main ──────────────────────────────────────────────────────────────────

def main():
    cache: list[dict] = json.loads(CACHE_FILE.read_text(encoding="utf-8")) if CACHE_FILE.exists() else []
    cached_ids   = {c["id"] for c in cache}
    cached_names = {c["name"].lower() for c in cache}

    curated_names = get_curated_names()
    skip_names    = curated_names | cached_names

    print(f"Curated: {len(curated_names)}  Previously discovered: {len(cache)}")
    if ANTHROPIC_API_KEY:
        print("Claude enrichment: enabled")
    else:
        print("Claude enrichment: disabled (set ANTHROPIC_API_KEY to enable)")

    # ── LinkedIn discovery ────────────────────────────────────────────────
    company_jobs: dict[str, list[dict]] = {}
    any_results = False
    for query in SEARCH_QUERIES:
        print(f"\n→ {query}")
        results = linkedin_search(query)
        if results:
            any_results = True
        for job in results:
            cname = job["company"].strip()
            if not cname or cname.lower() in skip_names:
                continue
            company_jobs.setdefault(cname, [])
            if not any(j["title"] == job["title"] for j in company_jobs[cname]):
                company_jobs[cname].append(job)

    new_entries: list[dict] = []
    for cname, jobs in company_jobs.items():
        if len(jobs) < MIN_JOBS_FOR_INCLUSION:
            continue
        if slugify(cname) in cached_ids:
            continue
        print(f"  + {cname} ({len(jobs)} jobs)")
        entry = build_entry(cname, jobs)
        new_entries.append(entry)
        skip_names.add(cname.lower())
        cached_ids.add(entry["id"])

    if not any_results:
        print("\nLinkedIn blocked — enriching existing cache only.")

    # ── Enrich new entries ────────────────────────────────────────────────
    if new_entries:
        print(f"\n── Enriching {len(new_entries)} new companies ──")
        for entry in new_entries:
            enrich_entry(entry)
            time.sleep(1)

    # ── Enrich existing entries that are missing data ─────────────────────
    stale = [c for c in cache if needs_enrichment(c)]
    if stale:
        print(f"\n── Re-enriching {len(stale)} existing companies ──")
        for entry in stale:
            enrich_entry(entry)
            time.sleep(1)

    updated_cache = cache + new_entries
    CACHE_FILE.write_text(json.dumps(updated_cache, indent=2, ensure_ascii=False), encoding="utf-8")

    if new_entries:
        print(f"\nAdded {len(new_entries)} new companies (total: {len(updated_cache)})")
    else:
        print(f"\nNo new companies. Cache unchanged ({len(cache)} companies).")

    print()
    write_ts(updated_cache)
    write_jobs_ts(updated_cache)


if __name__ == "__main__":
    main()
