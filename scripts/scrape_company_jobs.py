#!/usr/bin/env python3
"""Scan saved public company career pages and queue only newly discovered jobs."""
from __future__ import annotations
import hashlib, html, json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser

MAX_BYTES = 2_500_000
MAX_PAGES = 24
ADMIN_UID = "nkXAUBb7ffZQ5CtyShWl6YcQ39t2"
UA = "BooterSpaceCareerScanner/2.0 (+https://aizzdemon.github.io/booterspace/)"
JOB_PATH = re.compile(r"(career|jobs?|openings?|vacanc|requisition|position|workday|greenhouse|lever|ashby|smartrecruiters|jobvite)", re.I)
ATS_HOST = re.compile(r"(greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|workday\.com|smartrecruiters\.com|jobvite\.com|icims\.com|successfactors\.com|oraclecloud\.com|taleo\.net|bamboohr\.com)$", re.I)

def now():
    return datetime.now(timezone.utc)

def parse_date(value):
    if not value:
        return None
    if hasattr(value, "to_datetime"):
        try:
            d = value.to_datetime()
            return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d.astimezone(timezone.utc)
        except Exception:
            return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value / 1000 if value > 10_000_000_000 else value, timezone.utc)
        except (ValueError, OverflowError, OSError):
            return None
    if not isinstance(value, str):
        return None
    value = value.strip()
    try:
        d = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d.astimezone(timezone.utc)
    except ValueError:
        pass
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%d %b %Y", "%d %B %Y", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None

def safe_url(url, base=""):
    if not isinstance(url, str):
        return ""
    url = urllib.parse.urljoin(base, url.strip())
    p = urllib.parse.urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname or p.username or p.password:
        return ""
    host = p.hostname.lower()
    if host in ("localhost", "127.0.0.1", "0.0.0.0", "::1") or host.endswith(".local"):
        return ""
    return urllib.parse.urlunparse((p.scheme, p.netloc, p.path or "/", p.params, p.query, ""))

def fetch(url):
    url = safe_url(url)
    if not url:
        raise ValueError("Invalid public HTTP/HTTPS URL")
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"})
    with urllib.request.urlopen(req, timeout=22) as response:
        final = safe_url(response.geturl())
        body = response.read(MAX_BYTES + 1)
        if not final:
            raise ValueError("Unsafe redirect target")
        if len(body) > MAX_BYTES:
            body = body[:MAX_BYTES]
        content_type = response.headers.get("Content-Type", "").lower()
        if "html" not in content_type and not body.lstrip().lower().startswith((b"<!doctype html", b"<html")):
            raise ValueError("URL did not return HTML")
        return final, body.decode(response.headers.get_content_charset() or "utf-8", errors="replace")

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links, self.jsonld, self.meta = [], [], {}
        self.title, self.text = [], []
        self.in_title = False
        self.in_script = False
        self.is_jsonld = False
        self.buffer = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        tag = tag.lower()
        if tag == "a" and a.get("href"):
            self.links.append((a["href"], a.get("aria-label") or a.get("title") or ""))
        if tag == "meta":
            key = (a.get("property") or a.get("name") or "").lower()
            if key and a.get("content"):
                self.meta[key] = a["content"]
        if tag == "title":
            self.in_title = True
        if tag == "script":
            self.in_script = True
            self.is_jsonld = (a.get("type") or "").lower() == "application/ld+json"
            self.buffer = []

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if not self.in_script and data.strip():
            self.text.append(data.strip())
        if self.in_script and self.is_jsonld:
            self.buffer.append(data)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "title":
            self.in_title = False
        if tag == "script":
            if self.is_jsonld:
                try:
                    self.jsonld.append(json.loads("".join(self.buffer)))
                except (json.JSONDecodeError, TypeError):
                    pass
            self.in_script = self.is_jsonld = False
            self.buffer = []

def walk(value):
    if isinstance(value, list):
        for item in value:
            yield from walk(item)
    elif isinstance(value, dict):
        typ = value.get("@type", [])
        typ = typ if isinstance(typ, list) else [typ]
        if any(str(x).lower() == "jobposting" for x in typ):
            yield value
        for child in value.values():
            if isinstance(child, (dict, list)):
                yield from walk(child)

def val(value):
    if isinstance(value, str):
        return html.unescape(re.sub(r"<[^>]+>", " ", value)).strip()
    if isinstance(value, list):
        return ", ".join(filter(None, (val(x) for x in value)))
    if isinstance(value, dict):
        for key in ("name", "value", "addressLocality", "addressRegion", "addressCountry", "streetAddress"):
            if value.get(key):
                return val(value[key])
    return ""

def location_of(job):
    raw = job.get("jobLocation") or job.get("applicantLocationRequirements") or []
    raw = raw if isinstance(raw, list) else [raw]
    places = []
    for item in raw:
        if isinstance(item, dict):
            address = item.get("address", item)
            if isinstance(address, dict):
                parts = [val(address.get(k)) for k in ("addressLocality", "addressRegion", "addressCountry", "streetAddress")]
                places.append(", ".join(x for x in parts if x))
            else:
                places.append(val(item))
        elif item:
            places.append(val(item))
    if job.get("jobLocationType") == "TELECOMMUTE" and not places:
        places.append("Remote")
    return "; ".join(dict.fromkeys(x for x in places if x)) or "Not specified"

def normalized_url(url):
    p = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit((p.scheme.lower(), (p.hostname or "").lower().removeprefix("www."), re.sub(r"/+$", "", p.path or "/"), "", ""))

def identity(url, title="", location=""):
    seed = normalized_url(url) if url else "|".join((re.sub(r"\W+", " ", title.lower()).strip(), re.sub(r"\W+", " ", location.lower()).strip()))
    return hashlib.sha256(seed.encode()).hexdigest()

def date_from_page(parser, job=None):
    job = job or {}
    for candidate in (job.get("datePosted"), job.get("datePublished"), job.get("dateCreated"),
                     parser.meta.get("article:published_time"), parser.meta.get("date"),
                     parser.meta.get("publish-date"), parser.meta.get("datepublished")):
        parsed = parse_date(candidate)
        if parsed:
            return parsed
    text = " ".join(parser.text)
    match = re.search(r"(?:posted|published|date posted|posted on)\s*[:\-]?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})", text, re.I)
    return parse_date(match.group(1)) if match else None

def make_job(raw, page_url, company, fallback_title="", page_parser=None):
    title = val(raw.get("title") or raw.get("name")) or fallback_title
    if not title:
        return None
    posted = date_from_page(page_parser, raw) if page_parser else parse_date(raw.get("datePosted") or raw.get("datePublished"))
    url = safe_url(val(raw.get("url") or raw.get("sameAs") or page_url), page_url)
    if not url:
        return None
    description = val(raw.get("description") or raw.get("responsibilities") or "")
    if not description and page_parser:
        description = val(page_parser.meta.get("description") or page_parser.meta.get("og:description"))
    description = description or title + " — See the official company listing for complete details."
    organization = raw.get("hiringOrganization") or {}
    company_name = val(organization.get("name")) if isinstance(organization, dict) else ""
    place = location_of(raw) if raw else "Not specified"
    employment = val(raw.get("employmentType") or "Not specified")
    salary = raw.get("baseSalary")
    if isinstance(salary, dict):
        salary = val(salary.get("value") or salary.get("currency") or "")
    return {
        "title": title, "jobTitle": title,
        "company": company_name or company.get("companyName") or "Company",
        "companyName": company_name or company.get("companyName") or "Company",
        "location": place, "jobPlace": place,
        "postedDate": posted.date().isoformat() if posted else "",
        "dateVerified": bool(posted),
        "description": description[:18000], "jobDetails": description[:18000],
        "applyLink": url, "jobLink": url, "officialJobUrl": url, "sourceUrl": url,
        "source": "Company Website",
        "sourceBoard": company.get("normalizedDomain") or urllib.parse.urlparse(company.get("websiteUrl", "")).hostname,
        "sourceJobId": val(raw.get("identifier")) or url,
        "type": employment, "jobType": employment, "salary": val(salary),
        "automated": True, "status": "pending", "userId": ADMIN_UID,
        "userName": "BooterSpace Job Automation"
    }

def is_job_link(url, label):
    p = urllib.parse.urlparse(url)
    host = (p.hostname or "").lower()
    path = (p.path or "").lower()
    hint = (url + " " + label).lower()
    return bool(JOB_PATH.search(path) or ATS_HOST.search(host) or re.search(r"\b(apply|view job|job details|learn more)\b", label, re.I))

def career_links(base, links):
    base_host = (urllib.parse.urlparse(base).hostname or "").lower()
    found = []
    for href, label in links:
        url = safe_url(href, base)
        host = (urllib.parse.urlparse(url).hostname or "").lower()
        if not url or url == base or not is_job_link(url, label):
            continue
        if host != base_host and not ATS_HOST.search(host) and not JOB_PATH.search(url):
            continue
        if url not in found:
            found.append(url)
    return found[:MAX_PAGES - 1]

def firestore():
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        raise RuntimeError("Missing FIREBASE_SERVICE_ACCOUNT_JSON GitHub Actions secret.")
    import firebase_admin
    from firebase_admin import credentials, firestore as firestore_module
    info = json.loads(raw)
    project = os.environ.get("FIREBASE_PROJECT_ID") or info.get("project_id") or "kar-kardan"
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(info), {"projectId": project})
    return firestore_module.client(), firestore_module

def collect(company):
    base = safe_url(company.get("websiteUrl", ""))
    if not base:
        raise ValueError("Invalid company URL")
    first_url, first_html = fetch(base)
    first_parser = PageParser()
    first_parser.feed(first_html)
    pages = [(first_url, first_html, "")]
    for link in career_links(first_url, first_parser.links):
        try:
            page_url, page_html = fetch(link)
            pages.append((page_url, page_html, ""))
        except Exception as error:
            print("Career page skipped:", link, type(error).__name__, str(error)[:100])

    # Follow likely individual job links found on career/listing pages.
    listing_pages = list(pages)
    candidate_count = 0
    for page_url, page_html, _ in listing_pages:
        parser = PageParser()
        parser.feed(page_html)
        for href, label in parser.links:
            job_url = safe_url(href, page_url)
            if not job_url or not is_job_link(job_url, label) or len(label.strip()) < 5:
                continue
            if job_url in {x[0] for x in pages}:
                continue
            pages.append((job_url, "", label.strip()))
            candidate_count += 1
            if len(pages) >= MAX_PAGES:
                break
        if len(pages) >= MAX_PAGES:
            break

    jobs = {}
    for page_url, content, fallback_title in pages:
        try:
            if not content:
                page_url, content = fetch(page_url)
            parser = PageParser()
            parser.feed(content)
            for root in parser.jsonld:
                for raw in walk(root):
                    job = make_job(raw, page_url, company, page_parser=parser)
                    if job:
                        jobs[identity(job["officialJobUrl"], job["title"], job["location"])] = job

            # Fallback: many career sites have ordinary HTML job detail pages, not JobPosting JSON-LD.
            if fallback_title and not any(normalized_url(x["officialJobUrl"]) == normalized_url(page_url) for x in jobs.values()):
                page_title = val(parser.meta.get("og:title") or parser.meta.get("twitter:title")) or " ".join(parser.title).strip()
                title = fallback_title
                if page_title and len(page_title) > len(title) and len(page_title) < 180:
                    title = page_title
                job = make_job({}, page_url, company, fallback_title=title, page_parser=parser)
                if job:
                    jobs[identity(job["officialJobUrl"], job["title"], job["location"])] = job
        except Exception as error:
            print("Job page skipped:", page_url, type(error).__name__, str(error)[:100])
    return jobs, len(pages)

def process(db, fs, request_ref):
    request = request_ref.get().to_dict() or {}
    if request.get("status") != "queued":
        return
    request_ref.update({"status": "processing", "startedAt": fs.SERVER_TIMESTAMP})
    created = skipped = failed = scanned = 0
    errors = []
    for company_doc in db.collection("companyWebsites").stream():
        company = company_doc.to_dict() or {}
        company["id"] = company_doc.id
        try:
            jobs, page_count = collect(company)
            scanned += 1
            previous_scan = parse_date(company.get("lastScanAt"))
            first_scan = previous_scan is None
            cutoff = (previous_scan or parse_date(company.get("createdAt")) or now()).replace(hour=0, minute=0, second=0, microsecond=0)
            for job_id, job in jobs.items():
                history_ref = db.collection("scrapedJobHistory").document(job_id)
                if history_ref.get().exists or db.collection("jobs").document(job_id).get().exists:
                    skipped += 1
                    continue
                posted = parse_date(job.get("postedDate"))
                if posted and posted < cutoff:
                    history_ref.set({"companyId": company_doc.id, "postedDate": job["postedDate"], "officialJobUrl": job["officialJobUrl"], "firstSeenAt": fs.SERVER_TIMESTAMP, "status": "baseline_old"})
                    skipped += 1
                    continue
                if not posted and first_scan:
                    # Establish a baseline on first scan: don't import undated legacy listings.
                    history_ref.set({"companyId": company_doc.id, "postedDate": "", "officialJobUrl": job["officialJobUrl"], "firstSeenAt": fs.SERVER_TIMESTAMP, "status": "baseline_undated"})
                    skipped += 1
                    continue
                if not posted:
                    job["postedDate"] = "Date not provided"
                    job["dateVerified"] = False
                job.update({
                    "timestamp": fs.SERVER_TIMESTAMP, "createdAt": fs.SERVER_TIMESTAMP,
                    "likes": 0, "dislikes": 0, "companyWebsiteId": company_doc.id,
                    "scrapeIdentity": job_id
                })
                db.collection("jobs").document(job_id).set(job)
                history_ref.set({
                    "companyId": company_doc.id, "postedDate": job.get("postedDate", ""),
                    "officialJobUrl": job["officialJobUrl"], "firstSeenAt": fs.SERVER_TIMESTAMP,
                    "status": "imported"
                })
                created += 1
            company_doc.reference.update({
                "lastScanAt": fs.SERVER_TIMESTAMP,
                "lastScanStatus": f"Scanned {page_count} page(s); found {len(jobs)} job(s); added {created} new job(s)",
                "lastScanError": ""
            })
        except Exception as error:
            failed += 1
            err = f"{type(error).__name__}: {str(error)[:160]}"
            errors.append((company.get("companyName", "company"), err))
            company_doc.reference.update({"lastScanStatus": "Error: " + err, "lastScanError": err})
        time.sleep(0.25)
    summary = f"Scanned {scanned} company website(s); added {created} new job(s), skipped {skipped} old/duplicate, {failed} failed."
    print(summary)
    for name, error in errors[:20]:
        print(f"Scan error for {name}: {error}")
    request_ref.update({
        "status": "completed" if not failed else "completed_with_errors",
        "finishedAt": fs.SERVER_TIMESTAMP, "message": summary,
        "newJobs": created, "skippedJobs": skipped, "failedCompanies": failed
    })

def main():
    db, fs = firestore()
    requests = list(db.collection("jobScrapeRequests").where("status", "==", "queued").limit(3).stream())
    if not requests:
        print("No queued manual scrape requests.")
        return
    for request in requests:
        try:
            process(db, fs, request.reference)
        except Exception as error:
            print("Request failed:", type(error).__name__, str(error)[:180])
            try:
                request.reference.update({"status": "failed", "message": f"{type(error).__name__}: {str(error)[:150]}", "finishedAt": fs.SERVER_TIMESTAMP})
            except Exception:
                pass

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("FATAL:", type(error).__name__, str(error)[:220], file=sys.stderr)
        raise
