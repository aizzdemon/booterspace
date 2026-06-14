import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import JobCard from '../components/JobCard';
import PageHero from '../components/PageHero';
import { db } from '../lib/firebase';
import { fallbackJobs } from '../data/jobs';
import { setSeo } from '../lib/seo';

export default function Jobs() {
  const [jobs, setJobs] = useState(fallbackJobs);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [source, setSource] = useState('Bundled fallback');
  useEffect(() => setSeo({ title: 'Jobs – BooterSpace', description: 'Browse curated private-sector job listings on BooterSpace.', canonicalPath: '/jobs' }), []);
  useEffect(() => {
    const q = query(collection(db, 'jobs'), where('status', 'in', ['approved', 'active', 'published']), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => {
      if (!snap.empty) { setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data(), postedDate: d.data().postedDate || d.data().timestamp?.toDate?.().toISOString().slice(0,10) }))); setSource('Firestore'); }
    }, () => setSource('Bundled fallback'));
  }, []);
  const filtered = useMemo(() => jobs.filter((job) => {
    const hay = `${job.title} ${job.company} ${job.location} ${job.type}`.toLowerCase();
    if (search && !hay.includes(search.toLowerCase())) return false;
    if (filter === 'remote') return hay.includes('remote');
    if (filter === 'fresher') return job.category === 'fresher' || job.isFresher;
    if (filter === 'internship') return hay.includes('intern');
    return true;
  }), [jobs, search, filter]);
  return <><PageHero eyebrow="Jobs" title="Discover your dream job"><p>Browse high-quality roles from Firestore with a bundled fallback for resilient SEO-friendly content.</p></PageHero><section className="container-shell py-10"><div className="card mb-6 grid gap-3 p-4 md:grid-cols-[1fr_auto]"><input className="input" placeholder="Search title, company, location" value={search} onChange={e=>setSearch(e.target.value)} /><div className="flex flex-wrap gap-2">{['all','remote','fresher','internship'].map(f=><button key={f} onClick={()=>setFilter(f)} className={filter===f?'btn-primary':'btn-secondary'}>{f}</button>)}</div></div><div className="mb-4 flex justify-between text-sm text-slate-500"><span>{filtered.length} jobs</span><span>Data source: {source}</span></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map(job => <JobCard key={job.id} job={job} />)}</div></section></>;
}
