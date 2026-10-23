#!/usr/bin/env python3
"""Process admin-requested scans of saved public company career websites."""
from __future__ import annotations
import hashlib, html, json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
MAX_BYTES=2_500_000
MAX_PAGES=8
ADMIN_UID="nkXAUBb7ffZQ5CtyShWl6YcQ39t2"
UA="BooterSpaceCareerScanner/1.0 (+https://aizzdemon.github.io/booterspace/)"

def now(): return datetime.now(timezone.utc)
def parse_date(v):
    if not v:return None
    if hasattr(v,"to_datetime"):
        try:return v.to_datetime().astimezone(timezone.utc)
        except Exception:return None
    if isinstance(v,(int,float)):
        try:return datetime.fromtimestamp(v/1000 if v>10_000_000_000 else v,timezone.utc)
        except (ValueError,OverflowError,OSError):return None
    if not isinstance(v,str):return None
    try:
        d=datetime.fromisoformat(v.strip().replace("Z","+00:00"))
        return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d.astimezone(timezone.utc)
    except ValueError:return None
def safe_url(url,base=""):
    if not isinstance(url,str):return ""
    url=urllib.parse.urljoin(base,url.strip());p=urllib.parse.urlparse(url)
    if p.scheme not in ("http","https") or not p.hostname or p.username or p.password:return ""
    if p.hostname.lower() in ("localhost","127.0.0.1","0.0.0.0","::1"):return ""
    return urllib.parse.urlunparse((p.scheme,p.netloc,p.path or "/",p.params,p.query,""))
def fetch(url):
    url=safe_url(url)
    if not url:raise ValueError("Invalid public HTTP/HTTPS URL")
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"text/html,application/xhtml+xml"})
    with urllib.request.urlopen(req,timeout=20) as r:
        final=safe_url(r.geturl());body=r.read(MAX_BYTES+1)
        if not final:raise ValueError("Unsafe redirect target")
        if len(body)>MAX_BYTES:body=body[:MAX_BYTES]
        if "html" not in r.headers.get("Content-Type","").lower() and not body.lstrip().lower().startswith((b"<!doctype html",b"<html")):raise ValueError("URL did not return HTML")
        return final,body.decode(r.headers.get_content_charset() or "utf-8",errors="replace")
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.links=[];self.jsonld=[];self.script=False;self.ld=False;self.buf=[]
    def handle_starttag(self,t,attrs):
        a=dict(attrs)
        if t.lower()=="a" and a.get("href"):self.links.append((a["href"],a.get("aria-label") or a.get("title") or ""))
        if t.lower()=="script":self.script=True;self.ld=(a.get("type") or "").lower()=="application/ld+json";self.buf=[]
    def handle_data(self,d):
        if self.script and self.ld:self.buf.append(d)
    def handle_endtag(self,t):
        if t.lower()=="script":
            if self.ld:
                try:self.jsonld.append(json.loads("".join(self.buf)))
                except (json.JSONDecodeError,TypeError):pass
            self.script=self.ld=False;self.buf=[]
def walk(o):
    if isinstance(o,list):
        for x in o:yield from walk(x)
    elif isinstance(o,dict):
        typ=o.get("@type",[]);typ=typ if isinstance(typ,list) else [typ]
        if any(str(x).lower()=="jobposting" for x in typ):yield o
        for k,v in o.items():
            if k in ("@graph","mainEntity","itemListElement"):yield from walk(v)
def val(v):
    if isinstance(v,str):return html.unescape(re.sub(r"<[^>]+>"," ",v)).strip()
    if isinstance(v,list):return ", ".join(filter(None,(val(x) for x in v)))
    if isinstance(v,dict):
        for k in ("name","value","addressLocality","addressRegion","addressCountry","streetAddress"):
            if v.get(k):return val(v[k])
    return ""
def loc(job):
    raw=job.get("jobLocation") or job.get("applicantLocationRequirements") or [];raw=raw if isinstance(raw,list) else [raw];out=[]
    for x in raw:
        if isinstance(x,dict):
            a=x.get("address",x);parts=[val(a.get(k)) for k in ("addressLocality","addressRegion","addressCountry","streetAddress")] if isinstance(a,dict) else []
            out.append(", ".join(y for y in parts if y) or val(x))
        elif x:out.append(val(x))
    if job.get("jobLocationType")=="TELECOMMUTE" and not out:out.append("Remote")
    return "; ".join(dict.fromkeys(x for x in out if x)) or "Not specified"
def norm(url):
    p=urllib.parse.urlsplit(url);return urllib.parse.urlunsplit((p.scheme.lower(),(p.hostname or "").lower().removeprefix("www."),re.sub(r"/+$","",p.path or "/"),"",""))
def identity(url,title,location):
    seed=norm(url) or "|".join((re.sub(r"\W+"," ",title.lower()).strip(),re.sub(r"\W+"," ",location.lower()).strip()))
    return hashlib.sha256(seed.encode()).hexdigest()
def extract(j,page,company):
    title=val(j.get("title") or j.get("name"));posted=parse_date(j.get("datePosted"));url=safe_url(val(j.get("url") or j.get("sameAs") or page),page)
    if not title or not posted or not url:return None
    desc=val(j.get("description") or j.get("responsibilities") or "") or title+" — See the official company listing for complete details."
    org=j.get("hiringOrganization") or {};name=val(org.get("name")) if isinstance(org,dict) else ""
    location=loc(j);kind=val(j.get("employmentType") or "Full-time");salary=j.get("baseSalary")
    if isinstance(salary,dict):salary=val(salary.get("value") or salary.get("currency") or "")
    return {"title":title,"jobTitle":title,"company":name or company.get("companyName") or "Company","companyName":name or company.get("companyName") or "Company","location":location,"jobPlace":location,"postedDate":posted.date().isoformat(),"description":desc[:18000],"jobDetails":desc[:18000],"applyLink":url,"jobLink":url,"officialJobUrl":url,"sourceUrl":url,"source":"Company Website","sourceBoard":company.get("normalizedDomain") or urllib.parse.urlparse(company.get("websiteUrl","")).hostname,"sourceJobId":val(j.get("identifier")) or url,"type":kind,"jobType":kind,"salary":val(salary),"automated":True,"status":"pending","userId":ADMIN_UID,"userName":"BooterSpace Job Automation"}
def career_links(base,links):
    host=urllib.parse.urlparse(base).hostname or "";out=[]
    for href,label in links:
        url=safe_url(href,base);hint=(href+" "+label).lower()
        if url and urllib.parse.urlparse(url).hostname==host and re.search(r"career|jobs|job-open|openings|work-with-us|join-our-team|vacanc",hint) and url!=base and url not in out:out.append(url)
    return out[:MAX_PAGES-1]
def firestore():
    raw=os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON","").strip()
    if not raw:raise RuntimeError("Missing FIREBASE_SERVICE_ACCOUNT_JSON GitHub Actions secret.")
    import firebase_admin
    from firebase_admin import credentials,firestore
    info=json.loads(raw);project=os.environ.get("FIREBASE_PROJECT_ID") or info.get("project_id") or "kar-kardan"
    if not firebase_admin._apps:firebase_admin.initialize_app(credentials.Certificate(info),{"projectId":project})
    return firestore.client(),firestore
def collect(company):
    base=safe_url(company.get("websiteUrl",""))
    if not base:raise ValueError("Invalid company URL")
    first,body=fetch(base);p=Parser();p.feed(body);pages=[(first,body)]
    for link in career_links(first,p.links):
        try:pages.append(fetch(link))
        except Exception as e:print("Career page skipped:",type(e).__name__)
    jobs={}
    for page,content in pages:
        p=Parser();p.feed(content)
        for root in p.jsonld:
            for raw in walk(root):
                job=extract(raw,page,company)
                if job:jobs[identity(job["officialJobUrl"],job["title"],job["location"])]=job
    return jobs,len(pages)
def process(db,fs,ref):
    snap=ref.get();request=snap.to_dict() or {}
    if request.get("status")!="queued":return
    ref.update({"status":"processing","startedAt":fs.SERVER_TIMESTAMP})
    created=skipped=failed=scanned=0;errors=[]
    for cdoc in db.collection("companyWebsites").stream():
        c=cdoc.to_dict() or {};c["id"]=cdoc.id
        try:
            jobs,pagecount=collect(c);scanned+=1
            last=parse_date(c.get("lastScanAt"));added=parse_date(c.get("createdAt")) or now();cutoff=(last or added).replace(hour=0,minute=0,second=0,microsecond=0)
            for jid,j in jobs.items():
                posted=parse_date(j["postedDate"])
                if not posted or posted<cutoff:skipped+=1;continue
                history=db.collection("scrapedJobHistory").document(jid)
                if history.get().exists or db.collection("jobs").document(jid).get().exists:skipped+=1;continue
                history.set({"companyId":cdoc.id,"postedDate":j["postedDate"],"officialJobUrl":j["officialJobUrl"],"firstSeenAt":fs.SERVER_TIMESTAMP,"status":"imported"})
                j.update({"timestamp":fs.SERVER_TIMESTAMP,"createdAt":fs.SERVER_TIMESTAMP,"likes":0,"dislikes":0,"companyWebsiteId":cdoc.id,"scrapeIdentity":jid})
                db.collection("jobs").document(jid).set(j);created+=1
            cdoc.reference.update({"lastScanAt":fs.SERVER_TIMESTAMP,"lastScanStatus":f"Scanned {pagecount} page(s); {len(jobs)} dated job(s) found","lastScanError":""})
        except Exception as e:
            failed+=1;err=f"{type(e).__name__}: {str(e)[:160]}";errors.append((c.get("companyName","company"),err));cdoc.reference.update({"lastScanStatus":"Error: "+err,"lastScanError":err})
        time.sleep(.25)
    summary=f"Scanned {scanned} company website(s); added {created} new job(s), skipped {skipped} old/duplicate, {failed} failed."
    print(summary)
    for name,err in errors[:20]:print(f"Scan error for {name}: {err}")
    ref.update({"status":"completed" if not failed else "completed_with_errors","finishedAt":fs.SERVER_TIMESTAMP,"message":summary,"newJobs":created,"skippedJobs":skipped,"failedCompanies":failed})
def main():
    db,fs=firestore();reqs=list(db.collection("jobScrapeRequests").where("status","==","queued").limit(3).stream())
    if not reqs:print("No queued manual scrape requests.");return
    for r in reqs:
        try:process(db,fs,r.reference)
        except Exception as e:
            print("Request failed:",type(e).__name__,str(e)[:180])
            try:r.reference.update({"status":"failed","message":f"{type(e).__name__}: {str(e)[:150]}","finishedAt":fs.SERVER_TIMESTAMP})
            except Exception:pass
if __name__=="__main__":
    try:main()
    except Exception as e:print("FATAL:",type(e).__name__,str(e)[:220],file=sys.stderr);raise
