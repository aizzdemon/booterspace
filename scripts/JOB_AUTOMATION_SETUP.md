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

The collector currently uses public employer posting APIs for Greenhouse and Lever. The response contains the official employer/ATS job page, description, location, and (where provided) the direct apply URL. It keeps India and explicitly India-eligible remote roles, deduplicates by source + board + job ID, and never invents fallback jobs.

The board identifiers are listed in `job_sources.json`. To add a company, first open its official careers page and verify that its published jobs are hosted on Greenhouse (`job-boards.greenhouse.io/<slug>` or `boards.greenhouse.io/<slug>`) or Lever (`jobs.lever.co/<slug>`). Add the verified slug and display name to the matching array. Unsupported or unavailable boards are skipped and logged.

This is a curated starting list, not coverage of every private company in India. Job boards such as LinkedIn and Naukri are not scraped or bypassed; use their authorized integrations or employer-provided feeds if available.

## Review and deletion behavior

- New records are saved as `pending`, never auto-published.
- Approving a record changes its status to `approved`; the public jobs page reads approved records only.
- Deleting an automated record marks it `rejected` internally, so the next daily sync does not recreate it. It disappears from the review queue and public listing.
- Repeated runs refresh job details without changing an existing `approved` or `pending` status.
