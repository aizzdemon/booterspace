# BooterSpace job automation setup

## One-time Firebase setup

The daily workflow writes new automated job records into the existing Firestore `jobs` collection with `status: "pending"`. The existing `admin.html` Review Queue can then approve, edit, or delete them. Approved jobs are the only jobs displayed by `jobs.html`.

1. Open Firebase Console for project **kar-kardan**.
2. Go to **Project settings → Service accounts** and create/download a private key for a server-side service account with Firestore write access.
3. In GitHub, open **aizzdemon/booterspace → Settings → Secrets and variables → Actions → New repository secret**.
4. Set the secret name to `FIREBASE_SERVICE_ACCOUNT_JSON` and paste the complete service-account JSON file as its value.
5. Never commit that JSON key to the repository, place it in an HTML file, or share it in chat.
6. Open **Actions → Daily Job Data Update → Run workflow** to test it. Review the run logs and then check **admin.html → Jobs → Review Queue**.

The workflow uses project ID `kar-kardan`. No third-party job API key is needed.

## Sources and coverage

The collector searches HiringCafe's public read-only MCP endpoint (`https://hiringcafe.com/api/mcp`) and retains the existing Lever source. HiringCafe searches run for India-based customer support, software, data, and remote roles; results are normalized and filtered through the existing India-relevance rules. Direct employer application links are preferred where supplied. The collector deduplicates by source + source job ID and never invents fallback jobs.

The HiringCafe endpoint and search terms are configured in `scripts/job_sources.json`. You can add or change search terms there without changing the review, approval, Firebase, or public jobs-page workflow. HiringCafe rate-limits requests, so keep the configured searches reasonable. Lever board identifiers remain listed in the same file.

This is a curated starting list, not coverage of every private company in India. Job boards such as LinkedIn and Naukri are not scraped or bypassed; use their authorized integrations or employer-provided feeds if available.

## Review and deletion behavior

- New records are saved as `pending`, never auto-published.
- Approving a record changes its status to `approved`; the public jobs page reads approved records only.
- Deleting an automated record marks it `rejected` internally, so the next daily sync does not recreate it. It disappears from the review queue and public listing.
- Repeated runs refresh job details without changing an existing `approved` or `pending` status.
