import { Link } from 'react-router-dom';

export default function JobCard({ job }) {
  return (
    <article className="card flex h-full flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950">{job.title}</h3>
          <p className="font-semibold text-slate-700">{job.company}</p>
        </div>
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">{job.type || 'Full-time'}</span>
      </div>
      <div className="space-y-1 text-sm text-slate-500">
        <p>📍 {job.location || 'Remote'}</p>
        {job.salary && <p>💰 {job.salary}</p>}
        <p>Posted: {job.postedDate || job.posted || 'Recently'}</p>
      </div>
      <p className="line-clamp-3 flex-1 text-sm text-slate-600">{job.about || job.description || `${job.title} role at ${job.company}.`}</p>
      <div className="flex gap-2 pt-2">
        <Link to={`/jobs/${job.id}`} className="btn-secondary flex-1">Details</Link>
        {job.applyLink || job.apply ? <a href={job.applyLink || job.apply} target="_blank" rel="noreferrer" className="btn-primary flex-1">Apply</a> : null}
      </div>
    </article>
  );
}
