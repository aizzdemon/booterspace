const jobsList = document.getElementById('jobsList');
const jobCount = document.getElementById('jobCount');
const filterSummary = document.getElementById('filterSummary');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('[data-filter]');

const PAGE_SIZE = 12;
let allJobs = [];
let filteredJobs = [];
let currentFilter = 'all';
let renderedCount = 0;

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getJobTypeClass(type = '') {
  const normalized = type.toLowerCase();
  if (normalized.includes('intern')) return 'bg-violet-100 text-violet-700';
  if (normalized.includes('remote')) return 'bg-emerald-100 text-emerald-700';
  return 'bg-blue-100 text-blue-700';
}

function makeJobCard(job) {
  const card = document.createElement('article');
  card.className = 'bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-3';
  card.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-lg font-bold text-slate-900">${escapeHtml(job.title)}</h3>
      <span class="text-xs font-semibold px-2 py-1 rounded-full ${getJobTypeClass(job.type)}">${escapeHtml(job.type || 'Full-time')}</span>
    </div>
    <p class="text-slate-700 font-medium">${escapeHtml(job.company)}</p>
    <p class="text-slate-500 text-sm">📍 ${escapeHtml(job.location || 'Remote')}</p>
    <p class="text-slate-500 text-sm">Posted: ${escapeHtml(job.postedDate || 'N/A')}</p>
    <div class="pt-2">
      <a href="${escapeHtml(job.applyLink)}" target="_blank" rel="noopener" class="inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">Apply Now</a>
    </div>
  `;
  return card;
}

function updateJobSchema(jobs) {
  const schema = jobs.map((job) => ({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || `${job.title} role at ${job.company}`,
    datePosted: job.postedDate,
    employmentType: (job.type || 'FULL_TIME').toUpperCase().replace('-', '_'),
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location || 'Remote',
      },
    },
    baseSalary: job.salary
      ? {
          '@type': 'MonetaryAmount',
          currency: 'INR',
          value: {
            '@type': 'QuantitativeValue',
            value: job.salary,
            unitText: 'MONTH',
          },
        }
      : undefined,
    directApply: true,
    url: job.applyLink,
  }));

  let script = document.getElementById('jobsSchema');
  if (!script) {
    script = document.createElement('script');
    script.id = 'jobsSchema';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(schema);
}

function renderNextChunk() {
  const nextJobs = filteredJobs.slice(renderedCount, renderedCount + PAGE_SIZE);
  const fragment = document.createDocumentFragment();
  nextJobs.forEach((job) => fragment.appendChild(makeJobCard(job)));
  jobsList.appendChild(fragment);
  renderedCount += nextJobs.length;

  if (renderedCount >= filteredJobs.length) {
    observer.disconnect();
    sentinel.classList.add('hidden');
  } else {
    sentinel.classList.remove('hidden');
    observer.observe(sentinel);
  }
}

function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();

  filteredJobs = allJobs.filter((job) => {
    const matchesSearch = !q || job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (currentFilter === 'remote') return (job.location || '').toLowerCase().includes('remote') || (job.type || '').toLowerCase().includes('remote');
    if (currentFilter === 'fresher') return Boolean(job.isFresher);
    if (currentFilter === 'internship') return (job.type || '').toLowerCase().includes('intern');
    if (currentFilter === 'latest') {
      const days = (Date.now() - parseDate(job.postedDate).getTime()) / (1000 * 60 * 60 * 24);
      return days <= 7;
    }

    return true;
  });

  jobsList.innerHTML = '';
  renderedCount = 0;

  emptyState.classList.toggle('hidden', filteredJobs.length > 0);
  jobCount.textContent = `Latest Opportunities (${filteredJobs.length})`;
  filterSummary.textContent = currentFilter === 'all'
    ? 'Showing all verified job postings'
    : `Showing ${currentFilter} jobs`;

  updateJobSchema(filteredJobs.slice(0, 10));

  if (filteredJobs.length > 0) {
    renderNextChunk();
  }
}

async function loadJobs() {
  try {
    const response = await fetch('./jobs.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load jobs.json');
    const jobs = await response.json();
    allJobs = jobs.sort((a, b) => parseDate(b.postedDate) - parseDate(a.postedDate));
    applyFilters();
  } catch (error) {
    console.error(error);
    jobCount.textContent = 'Error loading jobs';
    filterSummary.textContent = 'Please try again later.';
    emptyState.classList.remove('hidden');
    jobsList.innerHTML = '';
  }
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.remove('bg-blue-600', 'text-white'));
    button.classList.add('bg-blue-600', 'text-white');
    applyFilters();
  });
});

searchInput.addEventListener('input', applyFilters);

const sentinel = document.getElementById('jobsSentinel');
const observer = new IntersectionObserver((entries) => {
  const first = entries[0];
  if (first.isIntersecting) {
    observer.unobserve(sentinel);
    renderNextChunk();
  }
}, { rootMargin: '200px' });

loadJobs();
