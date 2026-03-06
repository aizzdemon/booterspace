#!/usr/bin/env python3
"""Fetch jobs from public APIs and write to jobs.json."""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.error import URLError

ROOT = Path(__file__).resolve().parents[1]
OUT_FILE = ROOT / "jobs.json"

SOURCES = [
    {"name": "Remotive", "url": "https://remotive.com/api/remote-jobs", "parser": "parse_remotive"},
    {"name": "Arbeitnow", "url": "https://www.arbeitnow.com/api/job-board-api", "parser": "parse_arbeitnow"},
]


def fetch_json(url: str) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": "BooterSpaceJobBot/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def clean_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", text).strip()


def to_iso(value: str | None) -> str:
    if not value:
        return datetime.now(timezone.utc).date().isoformat()
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return datetime.now(timezone.utc).date().isoformat()


def job_type_from_text(*values: str) -> str:
    text = " ".join(v.lower() for v in values if v)
    if "intern" in text:
        return "Internship"
    if "remote" in text:
        return "Remote"
    if "part" in text:
        return "Part-time"
    return "Full-time"


def is_fresher_job(title: str, description: str) -> bool:
    text = f"{title} {description}".lower()
    return any(word in text for word in ["fresher", "entry level", "entry-level", "junior", "graduate"])


def parse_remotive(data: dict[str, Any]) -> Iterable[dict[str, Any]]:
    for item in data.get("jobs", []):
        description = clean_html(item.get("description", ""))
        title = item.get("title", "")
        yield {
            "title": title,
            "company": item.get("company_name", ""),
            "location": item.get("candidate_required_location", "Remote"),
            "salary": item.get("salary", ""),
            "type": job_type_from_text(item.get("job_type", ""), title, description),
            "postedDate": to_iso(item.get("publication_date")),
            "description": description,
            "applyLink": item.get("url", ""),
            "source": "Remotive",
            "isFresher": is_fresher_job(title, description),
        }


def parse_arbeitnow(data: dict[str, Any]) -> Iterable[dict[str, Any]]:
    for item in data.get("data", []):
        description = clean_html(item.get("description", ""))
        title = item.get("title", "")
        tags = " ".join(item.get("tags", []))
        yield {
            "title": title,
            "company": item.get("company_name", ""),
            "location": item.get("location", "Remote"),
            "salary": "",
            "type": job_type_from_text(tags, title, description),
            "postedDate": to_iso(item.get("created_at")),
            "description": description,
            "applyLink": item.get("url", ""),
            "source": "Arbeitnow",
            "isFresher": is_fresher_job(title, description),
        }


def unique_jobs(jobs: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str, str]] = set()
    final: list[dict[str, Any]] = []
    for job in jobs:
        key = (job.get("title", "").strip().lower(), job.get("company", "").strip().lower(), job.get("applyLink", "").strip().lower())
        if not all(key) or key in seen:
            continue
        seen.add(key)
        final.append(job)
    final.sort(key=lambda x: x.get("postedDate", ""), reverse=True)
    return final


def fallback_jobs() -> list[dict[str, Any]]:
    today = datetime.now(timezone.utc).date().isoformat()
    return [
        {
            "title": "Frontend Developer",
            "company": "BooterSpace Labs",
            "location": "Remote",
            "salary": "₹6-10 LPA",
            "type": "Remote",
            "postedDate": today,
            "description": "Build responsive UI components for the BooterSpace job portal.",
            "applyLink": "https://example.com/apply/frontend",
            "source": "Fallback",
            "isFresher": True,
        },
        {
            "title": "Backend Intern",
            "company": "BooterSpace Labs",
            "location": "Bengaluru, India",
            "salary": "",
            "type": "Internship",
            "postedDate": today,
            "description": "Support APIs, automation tasks, and data pipelines.",
            "applyLink": "https://example.com/apply/backend-intern",
            "source": "Fallback",
            "isFresher": True,
        },
    ]


def main() -> None:
    collected: list[dict[str, Any]] = []
    for source in SOURCES:
        try:
            data = fetch_json(source["url"])
            parser = globals()[source["parser"]]
            collected.extend(parser(data))
        except (URLError, TimeoutError, json.JSONDecodeError, KeyError) as err:
            print(f"Skipping {source['name']}: {err}")

    jobs = unique_jobs(collected) or fallback_jobs()
    OUT_FILE.write_text(json.dumps(jobs, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(jobs)} jobs to {OUT_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
