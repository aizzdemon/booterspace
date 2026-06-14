import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Admin() {
  const [jobs, setJobs] = useState([]);
  const [providers, setProviders] = useState([]);
  useEffect(() => onSnapshot(query(collection(db, 'jobs'), where('status','==','pending'), orderBy('timestamp','desc')), snap => setJobs(snap.docs.map(d=>({id:d.id,...d.data()}))), []);
  useEffect(() => onSnapshot(query(collection(db, 'users'), where('role','==','jobProvider')), snap => setProviders(snap.docs.map(d=>({id:d.id,...d.data()}))), []);
  return <section className="container-shell py-10"><h1 className="mb-6 text-3xl font-black">Admin dashboard</h1><div className="grid gap-6 lg:grid-cols-2"><div className="card p-6"><h2 className="text-2xl font-bold">Pending jobs</h2><div className="mt-4 space-y-3">{jobs.map(j=><article key={j.id} className="rounded-xl border p-4"><h3 className="font-bold">{j.title}</h3><p>{j.company}</p><div className="mt-3 flex gap-2"><button onClick={()=>updateDoc(doc(db,'jobs',j.id),{status:'approved'})} className="btn-primary">Approve</button><button onClick={()=>updateDoc(doc(db,'jobs',j.id),{status:'rejected'})} className="btn-secondary">Reject</button></div></article>)}</div></div><div className="card p-6"><h2 className="text-2xl font-bold">Job providers</h2><div className="mt-4 space-y-3">{providers.map(p=><article key={p.id} className="rounded-xl border p-4"><h3 className="font-bold">{p.name || p.email}</h3><p className="text-sm text-slate-500">{p.company} · access: {p.jobPostAccess || 'pending'}</p><button onClick={()=>updateDoc(doc(db,'users',p.id),{jobPostAccess:'allowed'})} className="btn-secondary mt-2">Allow posting</button></article>)}</div></div></div></section>;
}
