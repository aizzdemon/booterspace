import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fallbackJobs } from '../data/jobs';
import { setSeo } from '../lib/seo';

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(fallbackJobs.find((j) => j.id === id));
  useEffect(() => { (async () => { const snap = await getDoc(doc(db, 'jobs', id)).catch(() => null); if (snap?.exists()) setJob({ id: snap.id, ...snap.data() }); })(); }, [id]);
  useEffect(() => setSeo({ title: `${job?.title || 'Job Details'} – BooterSpace`, canonicalPath: `/jobs/${id}` }), [job, id]);
  if (!job) return <section className="container-shell py-16"><h1 className="text-3xl font-black">Job not found</h1><Link to="/jobs">Back to jobs</Link></section>;
  return <section className="container-shell py-12"><article className="card mx-auto max-w-3xl p-8"><Link to="/jobs" className="text-sm font-semibold">← Back to jobs</Link><h1 className="mt-4 text-4xl font-black">{job.title}</h1><p className="mt-2 text-xl font-semibold text-slate-700">{job.company}</p><dl className="mt-6 grid gap-4 sm:grid-cols-2"><div><dt className="label">Location</dt><dd>{job.location || 'Remote'}</dd></div><div><dt className="label">Salary</dt><dd>{job.salary || 'Not disclosed'}</dd></div><div><dt className="label">Type</dt><dd>{job.type || 'Full-time'}</dd></div><div><dt className="label">Posted by</dt><dd>{job.postedBy || job.source || 'BooterSpace'}</dd></div></dl><p className="mt-6 whitespace-pre-line text-slate-700">{job.about || job.description || `${job.title} role at ${job.company}.`}</p>{job.applyLink || job.apply ? <a href={job.applyLink || job.apply} target="_blank" rel="noreferrer" className="btn-primary mt-8">Apply now</a> : null}</article></section>;
}
