# BooterSpace Job Portal Upgrade

## Updated HTML structure
- `/index.html` (homepage with traffic sections + alert CTAs)
- `/jobs/index.html`
- `/remote-jobs/index.html`
- `/fresher-jobs/index.html`
- `/internships/index.html`
- `/latest-jobs/index.html`
- `/about-us.html`, `/contact.html`, `/privacy-policy.html`, `/terms-disclaimer.html`

## Recommended folder structure
```text
booterspace/
├── index.html
├── jobs/index.html
├── remote-jobs/index.html
├── fresher-jobs/index.html
├── internships/index.html
├── latest-jobs/index.html
├── about-us.html
├── contact.html
├── privacy-policy.html
├── terms-disclaimer.html
├── robots.txt
├── sitemap.xml
├── assets/css/portal.min.css
└── public/js/
    ├── jobs-data.min.js
    └── portal.min.js
```

## Example job listing template
```html
<article class="job">
  <div>
    <h3>Junior Frontend Developer</h3>
    <div class="meta">
      <span>PixelCraft Labs</span>
      <span>Bengaluru</span>
      <span>₹4-6 LPA</span>
      <span>Full-time</span>
      <span>Posted: 2026-03-01</span>
    </div>
    <p class="source">Source: Company Careers</p>
  </div>
  <div>
    <a class="apply" href="https://example.com/apply/frontend" target="_blank" rel="nofollow noopener">Apply now</a>
  </div>
</article>
```

## SEO tags and schema implementation
- Canonical tags and page-level meta descriptions are implemented in every major page.
- Structured data uses `WebSite` schema for homepage and `ItemList` schema for listing pages.
- URLs are now directory-based for better SEO (`/jobs/`, `/remote-jobs/`, etc.).
- `sitemap.xml` and `robots.txt` are included for search indexing.
