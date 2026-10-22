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
    """Convert ATS HTML to readable text while preserving headings and list items."""
    if not isinstance(value, str): return ""
    value = html.unescape(value)
    value = re.sub(r"(?is)<(script|style)\b[^>]*>.*?</\1>", " ", value)
    value = re.sub(r"(?i)<\s*br\s*/?>", "\n", value)
    value = re.sub(r"(?i)</\s*(p|div|section|article|h[1-6]|tr)\s*>", "\n\n", value)
    value = re.sub(r"(?i)<\s*li\b[^>]*>", "\n• ", value)
    value = re.sub(r"(?i)</\s*li\s*>", "\n", value)
    value = re.sub(r"(?s)<[^>]+>", " ", value)
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in value.splitlines()]
    cleaned = []
    for line in lines:
        if line:
            cleaned.append(line)
        elif cleaned and cleaned[-1] != "":
            cleaned.append("")
    return html.unescape("\n".join(cleaned)).strip()

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

def mcp_request(endpoint: str, request_id: int, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = {"jsonrpc": "2.0", "id": request_id, "method": method}
    if params is not None: payload["params"] = params
    req = urllib.request.Request(endpoint, data=json.dumps(payload).encode("utf-8"), headers={"User-Agent": USER_AGENT, "Content-Type": "application/json", "Accept": "application/json, text/event-stream"}, method="POST")
    with urllib.request.urlopen(req, timeout=45) as response: raw = response.read().decode("utf-8")
    try: return json.loads(raw)
    except json.JSONDecodeError:
        for line in raw.splitlines():
            if line.startswith("data:"):
                try: return json.loads(line[5:].strip())
                except json.JSONDecodeError: pass
    raise ValueError("HiringCafe MCP returned an unrecognized response")

def mcp_result_text(response: dict[str, Any]) -> Any:
    if response.get("error"): raise RuntimeError(str(response["error"]))
    result = response.get("result", {})
    if result.get("structuredContent") is not None: return result["structuredContent"]
    for block in result.get("content", []):
        if block.get("type") == "text" and isinstance(block.get("text"), str):
            try: return json.loads(block["text"])
            except json.JSONDecodeError: pass
    return result

def _first_value(obj: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = obj.get(key)
        if value not in (None, "", [], {}):
            return value
    return ""

def _job_items(data: Any) -> list[dict[str, Any]]:
    """Find job records across common MCP content/result envelopes."""
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    if not isinstance(data, dict):
        return []
    for key in ("jobs", "results", "items", "postings", "job_results", "jobResults"):
        value = data.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
        if isinstance(value, dict):
            nested = _job_items(value)
            if nested:
                return nested
    for key in ("data", "result", "structuredContent", "output"):
        value = data.get(key)
        nested = _job_items(value)
        if nested:
            return nested
    # Some MCP servers wrap each result as content blocks containing JSON text.
    for block in data.get("content", []) if isinstance(data.get("content"), list) else []:
        if isinstance(block, dict) and isinstance(block.get("text"), str):
            try:
                nested = _job_items(json.loads(block["text"]))
                if nested:
                    return nested
            except json.JSONDecodeError:
                continue
    return []

def _flatten_job(item: dict[str, Any]) -> dict[str, Any]:
    """Merge common nested job/company/location/metadata objects without losing top-level values."""
    merged: dict[str, Any] = {}
    for key in ("metadata", "job", "posting", "company", "employer", "location_data"):
        value = item.get(key)
        if isinstance(value, dict):
            for subkey, subvalue in value.items():
                merged.setdefault(subkey, subvalue)
    merged.update(item)
    company_obj = item.get("company") or item.get("employer")
    if isinstance(company_obj, dict):
        merged["company"] = _first_value(company_obj, "name", "company_name", "companyName", "title")
    location_obj = item.get("location") or item.get("job_location")
    if isinstance(location_obj, dict):
        merged["location"] = _first_value(location_obj, "name", "display_name", "city", "label", "formatted")
    return merged

def parse_hiringcafe(config: dict[str, Any]) -> list[dict[str, Any]]:
    endpoint = config.get("endpoint", "https://hiringcafe.com/api/mcp")
    initialized = mcp_request(endpoint, 1, "initialize", {"protocolVersion": "2025-03-26", "capabilities": {}, "clientInfo": {"name": "BooterSpace Job Collector", "version": "1.1.0"}})
    if initialized.get("error"):
        raise RuntimeError(f"HiringCafe initialize failed: {initialized['error']}")
    mcp_request(endpoint, 2, "notifications/initialized")
    tools_data = mcp_result_text(mcp_request(endpoint, 3, "tools/list", {}))
    available = tools_data.get("tools", []) if isinstance(tools_data, dict) else []
    search_tool = next((tool for tool in available if tool.get("name") == "search_jobs"), None)
    detail_tool = next((tool for tool in available if tool.get("name") == "get_job_details"), None)
    if not search_tool:
        raise RuntimeError("HiringCafe MCP did not advertise search_jobs")
    schema = search_tool.get("inputSchema", {}).get("properties", {}) or {}
    detail_schema = detail_tool.get("inputSchema", {}).get("properties", {}) or {} if detail_tool else {}
    searches = config.get("searches") or [
        {"search": "customer support", "location": "India", "limit": 25},
        {"search": "software", "location": "India", "limit": 25},
        {"search": "data", "location": "India", "limit": 25},
        {"search": "remote", "location": "India", "limit": 25}
    ]
    found: dict[str, dict[str, Any]] = {}
    request_id = 10
    for search_args in searches:
        # Only pass parameters advertised by the live MCP tool schema.
        args = {key: value for key, value in search_args.items() if key in schema}
        # Accommodate servers that call the keyword parameter query instead of search.
        if not args and "query" in schema:
            args = {"query": search_args.get("search", "")}
            if "location" in schema:
                args["location"] = search_args.get("location", "India")
            if "limit" in schema:
                args["limit"] = search_args.get("limit", 25)
        data = mcp_result_text(mcp_request(endpoint, request_id, "tools/call", {"name": "search_jobs", "arguments": args}))
        request_id += 1
        items = _job_items(data)
        print(f"HiringCafe search '{search_args.get('search', search_args.get('query', 'all'))}': {len(items)} raw result(s); response type={type(data).__name__}")
        for item in items:
            details = _flatten_job(item)
            job_id = _first_value(details, "id", "job_id", "jobId", "jobID", "uuid")
            if detail_tool and job_id:
                detail_key = next((key for key in ("job_id", "jobId", "id", "jobID") if key in detail_schema), None)
                if detail_key:
                    try:
                        extra = mcp_result_text(mcp_request(endpoint, request_id, "tools/call", {"name": "get_job_details", "arguments": {detail_key: job_id}}))
                        request_id += 1
                        if isinstance(extra, dict):
                            details.update(_flatten_job(extra))
                    except (urllib.error.URLError, TimeoutError, ValueError, RuntimeError, KeyError, TypeError) as err:
                        print(f"HiringCafe detail lookup skipped for {job_id}: {err}")
            title = _first_value(details, "title", "job_title", "jobTitle", "name", "position")
            company = _first_value(details, "company_name", "companyName", "employer_name", "employerName", "organization_name", "organizationName")
            if not company and isinstance(details.get("company"), str):
                company = details["company"]
            location = _first_value(details, "location", "job_location", "jobLocation", "locations", "location_name", "locationName", "workplace_location")
            if isinstance(location, list):
                location = ", ".join(str(x.get("name") or x.get("label") or x) if isinstance(x, dict) else str(x) for x in location)
            description = _first_value(details, "description", "job_description", "jobDescription", "summary", "text", "description_text", "descriptionText", "requirements_summary")
            posted = _first_value(details, "posted_at", "postedDate", "date_posted", "datePosted", "published_at", "publishedAt", "created_at", "createdAt")
            official = _first_value(details, "employer_apply_url", "employerApplyUrl", "apply_url", "applyUrl", "application_url", "applicationUrl", "job_url", "jobUrl", "url", "link")
            if isinstance(official, dict):
                official = _first_value(official, "url", "href")
            # Prefer an employer application URL, but keep a valid public job detail URL as a fallback.
            apply = _first_value(details, "employer_apply_url", "employerApplyUrl", "apply_url", "applyUrl", "application_url", "applicationUrl", "application_link", "applicationLink")
            if isinstance(apply, dict):
                apply = _first_value(apply, "url", "href")
            if not apply:
                apply = official
            if isinstance(official, str) and official.startswith("/"):
                official = urllib.parse.urljoin("https://hiringcafe.com", official)
            if isinstance(apply, str) and apply.startswith("/"):
                apply = urllib.parse.urljoin("https://hiringcafe.com", apply)
            salary = _first_value(details, "salary", "compensation", "salary_range", "salaryRange", "pay")
            kind = _first_value(details, "employment_type", "employmentType", "commitment", "workplace_type", "workplaceType", "job_type", "jobType")
            if not all((title, company, location, description, official)):
                missing = [key for key, value in (("title", title), ("company", company), ("location", location), ("description", description), ("url", official)) if not value]
                print(f"HiringCafe skipped incomplete record; missing={','.join(missing)}; keys={','.join(sorted(details.keys())[:30])}")
                continue
            job = make_job("HiringCafe", "hiringcafe", job_id or official, title, str(company), location, description, posted, official, apply, salary, kind)
            if job:
                found[job["id"]] = job
        time.sleep(0.5)
    return list(found.values())

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
    for provider, parser in (("hiringcafe", parse_hiringcafe), ("lever", parse_lever)):
        boards = [config.get(provider)] if provider == "hiringcafe" and config.get(provider) else config.get(provider, [])
        for board in boards:
            scanned += 1
            try:
                jobs = parser(board)
                print(f"{provider}:{board.get('slug', 'hiringcafe')} -> {len(jobs)} India-relevant jobs")
                for job in jobs: found[job["id"]] = job
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, TypeError, ValueError, RuntimeError) as err:
                failed += 1
                print(f"Skipping {provider}:{board.get('slug', 'hiringcafe')}: {err}")
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
    # Never replace a populated export with an empty list when a source is temporarily unavailable.
    if jobs:
        OUT_FILE.write_text(json.dumps(jobs, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {len(jobs)} real job record(s) to jobs.json.")
    else:
        existing = []
        try:
            existing = json.loads(OUT_FILE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            pass
        if existing:
            print(f"No new jobs collected; keeping the existing {len(existing)} job record(s) in jobs.json.")
        else:
            OUT_FILE.write_text("[]\n", encoding="utf-8")
            print("No real jobs collected; jobs.json remains empty rather than adding fake jobs.")
    created, updated, rejected = save_to_firestore(jobs)
    print(f"Firestore sync: {created} new pending, {updated} refreshed, {rejected} rejected jobs kept hidden.")

if __name__ == "__main__":
    try: main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
