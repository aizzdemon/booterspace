import { useState } from 'react';
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function PostJob() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ title:'', company:'', companyWebsite:'', logoUrl:'', location:'', salary:'', applyLink:'', about:'' });
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setStatus('Publishing…');
    try {
      const jobRef = await addDoc(collection(db, 'jobs'), { ...form, userId: user.uid, postedBy: user.email, status: 'pending', timestamp: serverTimestamp(), likes: 0, dislikes: 0 });
      const usersSnap = await getDocs(collection(db, 'users'));
      await Promise.all(usersSnap.docs.filter((u) => u.id !== user.uid).map((u) => addDoc(collection(db, 'notifications'), { toUid: u.id, fromUid: user.uid, type: 'job_posted', message: `New job posted: ${form.title} at ${form.company}`, link: `/jobs/${jobRef.id}`, read: false, createdAt: serverTimestamp() })));
      setForm({ title:'', company:'', companyWebsite:'', logoUrl:'', location:'', salary:'', applyLink:'', about:'' }); setStatus('✅ Job successfully posted and is pending admin approval.');
    } catch (error) { setStatus(`❌ Failed to post job: ${error.message}`); }
  }
  return <section className="container-shell py-12"><form onSubmit={submit} className="card mx-auto max-w-2xl space-y-4 p-8"><h1 className="text-3xl font-black">Post a job</h1><div className="grid gap-4 sm:grid-cols-2">{[['title','Job title'],['company','Company'],['companyWebsite','Company website'],['logoUrl','Logo URL'],['location','Job location'],['salary','Salary'],['applyLink','Apply link']].map(([k,l])=><input key={k} className="input" placeholder={l} value={form[k]} onChange={change(k)} required={['title','company','location','applyLink'].includes(k)} />)}</div><textarea className="input min-h-32" placeholder="Job description" value={form.about} onChange={change('about')} required /><button className="btn-primary w-full">Publish job</button>{status && <p className="text-sm text-slate-700">{status}</p>}</form></section>;
}
