#!/usr/bin/env python3
"""Collect India-relevant jobs from official public employer ATS APIs and queue them for admin review."""
from __future__ import annotations
import hashlib, html, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCES_FILE = ROOT / "scripts" / "job_sources.json"
OUT_FILE = ROOT / "jobs.json"
ADMIN_UID = "nkXAUBb7ffZQ5CtyShWl6YcQ39t2"
USER_AGENT = "BooterSpaceJobCollector/2.0 (+https://aizzdemon.github.io/booterspace/)"
INDIA_CITIES = ("bengaluru","bangalore","mumbai","new delhi","delhi","hyderabad","pune","chennai","kolkata","noida","gurugram","gurgaon","ahmedabad","jaipur","kochi","coimbatore","indore","chandigarh","thiruvananthapuram","lucknow","bhubaneswar","patna","gaya","surat","nagpur","visakhapatnam","mysuru","mysore")

def fetch_json(url: str) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=35) as response:
        return json.loads(response.read().decode("utf-8"))

def clean_html(value: Any) -> str:
    if not isinstance(value, str): return ""
    value = html.unescape(value)
    value = re.sub(r"(?is)<(script|style)\b[^>]*>.*?</\1>", " ", value)
    value = re.sub(r"(?s)<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", html.unescape(value)).strip()

def to_iso(value: Any) -> str:
    """Accept ISO strings, Unix seconds, and Unix milliseconds."""
    if value is None or value == "": return datetime.now(timezone.utc).date().isoformat()
    try:
        if isinstance(value, (int, float)):
            seconds = float(value) / 1000 if float(value) > 10_000_000_000 else float(value)
            return datetime.fromtimestamp(seconds, tz=timezone.utc).date().isoformat()
        if isinstance(value, str):
            value = value.strip()
            if value.isdigit(): return to_iso(int(value))
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
    except (ValueError, TypeError, OverflowError, OSError): pass
    return datetime.now(timezone.utc).date().isoformat()

def india_relevant(location: str, description: str) -> bool:
    loc, desc = (location or "").lower(), (description or "").lower()
    if "india" in loc or any(city in loc for city in INDIA_CITIES): return True
    remote = any(word in loc for word in ("remote", "work from home", "distributed"))
    if remote and any(word in loc for word in ("worldwide", "anywhere", "apac")): return True
    return remote and any(word in desc for word in ("based in india", "located in india", "india only", "india timezone", "india time zone"))

def safe_url(value: Any) -> str:
    if not isinstance(value, str): return ""
    value = value.strip()
    parsed = urllib.parse.urlparse(value)
    return value if parsed.scheme in ("https", "http") and parsed.netloc else ""

def job_type(*values: Any) -> str:
    text = " ".join(str(v or "") for v in values).lower()
    if "intern" in text: return "Internship"
    if "contract" in text or "temporary" in text: return "Contract"
    if "part-time" in text or "part time" in text: return "Part-time"
    if "remote" in text: return "Remote"
    return "Full-time"

def make_job(source: str, board: str, source_id: Any, title: Any, company: str, location: Any,
             description: Any, posted: Any, official_url: Any, apply_url: Any, salary: Any = "", kind: Any = "") -> dict[str, Any] | None:
    title, company, location = clean_html(title), clean_html(company), clean_html(location) or "Not specified"
    description = clean_html(description)
    official, apply = safe_url(official_url), safe_url(apply_url) or safe_url(official_url)
    if not title or not company or not description or not official or not apply: return None
    if not india_relevant(location, description): return None
    source_job_id = str(source_id or official)
    doc_id = hashlib.sha256(f"{source}|{board}|{source_job_id}".encode()).hexdigest()
    typ = job_type(kind, title, description, location)
    lower = f"{title} {description}".lower()
    return {
        "id": doc_id, "title": title, "jobTitle": title, "company": company, "companyName": company,
        "location": location, "jobPlace": location, "salary": clean_html(salary), "type": typ, "jobType": typ,
        "postedDate": to_iso(posted), "description": description[:18000], "jobDetails": description[:18000],
        "applyLink": apply, "jobLink": apply, "officialJobUrl": official, "sourceUrl": official,
        "source": source, "sourceBoard": board, "sourceJobId": source_job_id, "automated": True,
        "isFresher": any(w in lower for w in ("fresher","entry level","entry-level","junior","graduate","new grad","intern")),
        "status": "pending", "userId": ADMIN_UID, "userName": "BooterSpace Job Automation"
    }

def parse_greenhouse(board: dict[str, str]) -> list[dict[str, Any]]:
    slug = board["slug"]
    url = f"https://boards-api.greenhouse.io/v1/boards/{urllib.parse.quote(slug, safe='')}/jobs?content=true"
    data = fetch_json(url)
    out = []
    for item in data.get("jobs", []):
        location = (item.get("location") or {}).get("name", "")
        if not location and item.get("offices"):
            location = ", ".join(str(o.get("location") or o.get("name") or "") for o in item["offices"])
        official = item.get("absolute_url", "")
        job = make_job("Greenhouse", slug, item.get("id"), item.get("title"), board.get("company", slug.title()),
                       location, item.get("content", ""), item.get("updated_at"), official, official,
                       kind=" ".join(str(d.get("name", "")) for d in item.get("departments", [])))
        if job: out.append(job)
    return out

def parse_lever(board: dict[str, str]) -> list[dict[str, Any]]:
    slug = board["slug"]
    data = fetch_json(f"https://api.lever.co/v0/postings/{urllib.parse.quote(slug, safe='')}?mode=json")
    if not isinstance(data, list): return []
    out = []
    for item in data:
        cats = item.get("categories") or {}
        location = cats.get("allLocations") or cats.get("location") or ""
        if isinstance(location, list): location = ", ".join(map(str, location))
        salary = item.get("salaryDescriptionPlain") or ""
        sr = item.get("salaryRange")
        if not salary and isinstance(sr, dict) and (sr.get("min") is not None or sr.get("max") is not None):
            salary = f"{sr.get('currency','')} {sr.get('min','')}-{sr.get('max','')} {sr.get('interval','')}".strip()
        official = item.get("hostedUrl", "")
        job = make_job("Lever", slug, item.get("id"), item.get("text"), board.get("company", slug.title()),
                       location, item.get("descriptionPlain") or item.get("description", ""), item.get("createdAt"),
                       official, item.get("applyUrl") or official, salary, cats.get("commitment", ""))
        if job: out.append(job)
    return out

def collect_jobs() -> list[dict[str, Any]]:
    config = json.loads(SOURCES_FILE.read_text(encoding="utf-8"))
    found, scanned, failed = {}, 0, 0
    for provider, parser in (("greenhouse", parse_greenhouse), ("lever", parse_lever)):
        for board in config.get(provider, []):
            scanned += 1
            try:
                jobs = parser(board)
                print(f"{provider}:{board['slug']} -> {len(jobs)} India-relevant jobs")
                for job in jobs: found[job["id"]] = job
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, TypeError, ValueError) as err:
                failed += 1
                print(f"Skipping {provider}:{board.get('slug','?')}: {err}")
            time.sleep(0.35)
    result = sorted(found.values(), key=lambda x: x["postedDate"], reverse=True)
    print(f"Scanned {scanned} public employer boards; {failed} unavailable/failed; {len(result)} relevant jobs found.")
    return result

def firestore_client():
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        raise RuntimeError("Missing GitHub Actions secret FIREBASE_SERVICE_ACCOUNT_JSON. Add the Firebase service-account JSON as a repository Actions secret.")
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError as err:
        raise RuntimeError("firebase-admin is missing; install it before running this script.") from err
    info = json.loads(raw)
    project = os.environ.get("FIREBASE_PROJECT_ID") or info.get("project_id") or "kar-kardan"
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(info), {"projectId": project})
    return firestore.client(), firestore

def save_to_firestore(jobs: list[dict[str, Any]]) -> tuple[int, int, int]:
    db, firestore = firestore_client()
    created = updated = rejected = 0
    for job in jobs:
        ref = db.collection("jobs").document(job["id"])
        snap = ref.get()
        payload = {k: v for k, v in job.items() if k != "id"}
        if snap.exists:
            old = snap.to_dict() or {}
            status = old.get("status", "pending")
            # Admin delete marks automated jobs rejected so the next run will not re-add them.
            if status == "rejected":
                rejected += 1
                continue
            payload["status"] = status if status in ("pending", "approved") else "pending"
            payload["timestamp"] = old.get("timestamp") or firestore.SERVER_TIMESTAMP
            payload["createdAt"] = old.get("createdAt") or firestore.SERVER_TIMESTAMP
            ref.set(payload, merge=True)
            updated += 1
        else:
            payload["timestamp"] = firestore.SERVER_TIMESTAMP
            payload["createdAt"] = firestore.SERVER_TIMESTAMP
            payload["likes"], payload["dislikes"] = 0, 0
            ref.set(payload)
            created += 1
    return created, updated, rejected

def main():
    jobs = collect_jobs()
    # Never generate fake fallback jobs.
    OUT_FILE.write_text(json.dumps(jobs, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(jobs)} real job record(s) to jobs.json.")
    created, updated, rejected = save_to_firestore(jobs)
    print(f"Firestore sync: {created} new pending, {updated} refreshed, {rejected} rejected jobs kept hidden.")

if __name__ == "__main__":
    try: main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
