"""
Discover new US robotics companies from LinkedIn job postings.
Accumulates results in discovered_cache.json and regenerates
src/data/discoveredCompanies.ts. Run daily via GitHub Actions.
"""

import json
import re
import sys
import time
from collections import Counter
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
CURATED_FILE   = REPO_ROOT / "src" / "data" / "companies.ts"
OUTPUT_FILE    = REPO_ROOT / "src" / "data" / "discoveredCompanies.ts"
CACHE_FILE     = SCRIPT_DIR / "discovered_cache.json"

TIMEOUT = 15
MIN_JOBS_FOR_INCLUSION = 2  # ignore company unless this many distinct jobs found

# LinkedIn queries — broad enough to surface many robotics companies
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

# US state abbreviations to filter non-US job locations
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
    """Return lowercased company names already in hand-curated companies.ts."""
    if not CURATED_FILE.exists():
        return set()
    content = CURATED_FILE.read_text()
    return {m.group(1).lower() for m in re.finditer(r"name:\s*['\"]([^'\"]+)['\"]", content)}


# ── LinkedIn search ────────────────────────────────────────────────────────

def linkedin_search(query: str) -> list[dict]:
    """Return list of {title, company, location} from LinkedIn job search."""
    time.sleep(3)
    try:
        resp = requests.get(
            "https://www.linkedin.com/jobs/search/",
            params={
                "keywords": query,
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
        print(f"  ✗ search '{query}': {e}", file=sys.stderr)
        return []

    if any(x in resp.url for x in ("authwall", "/login", "/checkpoint")):
        print(f"  ✗ search '{query}': LinkedIn auth wall", file=sys.stderr)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    cards = soup.select("div.base-card") or soup.select("li.jobs-search__results-list > div")

    if not cards:
        print(f"  ✗ search '{query}': no cards (page structure may have changed)", file=sys.stderr)
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


# ── Company entry builder ─────────────────────────────────────────────────

def build_entry(name: str, jobs: list[dict]) -> dict:
    all_titles = [j["title"] for j in jobs]
    combined   = " ".join(all_titles)

    # HQ: most common non-remote location
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
        "website":        "",
        "founded":        0,
        "hq":             hq,
        "stage":          "CompanyStage.SeriesA",
        "problems":       domains,
        "techStack":      tech_stack,
        "products":       [],
        "description":    (
            f"Auto-discovered US robotics company working in {domain_readable}. "
            f"Based in {hq}. Profile built from live job postings — visit their "
            f"website for full details."
        ),
        "jobCount":       len(jobs),
        "discoveredDate": today_iso(),
    }


# ── TypeScript output ─────────────────────────────────────────────────────

def entry_to_ts(c: dict) -> str:
    problems_ts = ", ".join(c["problems"])
    tech_ts = ", ".join(
        f"{{ name: {json.dumps(t['name'])}, category: {t['category']} }}"
        for t in c["techStack"]
    )
    return (
        f"  {{\n"
        f"    id: {json.dumps(c['id'])},\n"
        f"    name: {json.dumps(c['name'])},\n"
        f"    logo: '',\n"
        f"    website: '',\n"
        f"    founded: 0,\n"
        f"    hq: {json.dumps(c['hq'])},\n"
        f"    stage: {c['stage']},\n"
        f"    problems: [{problems_ts}],\n"
        f"    techStack: [{tech_ts}],\n"
        f"    products: [],\n"
        f"    description: {json.dumps(c['description'])},\n"
        f"    jobCount: {c['jobCount']},\n"
        f"    discovered: true,\n"
        f"  }}"
    )


def write_ts(companies: list[dict]) -> None:
    if companies:
        entries = ",\n".join(entry_to_ts(c) for c in companies)
        body = entries + "\n"
    else:
        body = ""

    suppress = "" if companies else "\nvoid CompanyStage\nvoid ProblemDomain\nvoid TechCategory\n"

    content = (
        f"// AUTO-GENERATED by scripts/discover_companies.py — do not edit manually.\n"
        f"// Last updated: {today_iso()}\n\n"
        f"import {{ Company, CompanyStage, ProblemDomain, TechCategory }} from '../types'\n"
        f"{suppress}\n"
        f"export const discoveredCompanies: Company[] = [\n"
        f"{body}"
        f"]\n"
    )
    OUTPUT_FILE.write_text(content, encoding="utf-8")
    print(f"\nWrote {len(companies)} discovered companies → {OUTPUT_FILE.relative_to(REPO_ROOT)}")


# ── Main ──────────────────────────────────────────────────────────────────

def main():
    # Load persistent cache of previously discovered companies
    cache: list[dict] = json.loads(CACHE_FILE.read_text(encoding="utf-8")) if CACHE_FILE.exists() else []
    cached_ids   = {c["id"] for c in cache}
    cached_names = {c["name"].lower() for c in cache}

    # Names to skip (already curated or already discovered)
    curated_names = get_curated_names()
    skip_names    = curated_names | cached_names

    print(f"Curated: {len(curated_names)}  Previously discovered: {len(cache)}")

    # Collect jobs from LinkedIn across all queries
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

    # Build entries for newly discovered companies
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
        print("\nLinkedIn blocked or returned no results — keeping existing cache unchanged.")
        # Still regenerate TS from cache so the file header date stays current
        write_ts(cache)
        return

    # Merge new entries into cache and persist
    updated_cache = cache + new_entries
    CACHE_FILE.write_text(json.dumps(updated_cache, indent=2, ensure_ascii=False), encoding="utf-8")
    if new_entries:
        print(f"\nAdded {len(new_entries)} new companies to cache (total: {len(updated_cache)})")
    else:
        print(f"\nNo new companies found. Cache unchanged ({len(cache)} companies).")

    write_ts(updated_cache)


if __name__ == "__main__":
    main()
