import { useEffect, useState } from 'react';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ bio:'', skills:'', college:'', company:'', avatar:'' });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  useEffect(() => { setProfile((p) => ({ ...p, avatar: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}` })); }, [user]);
  async function save(e) { e.preventDefault(); const keywords = `${user.displayName || ''} ${profile.college} ${profile.company} ${profile.skills}`.toLowerCase().split(/\s+/).filter(Boolean); await setDoc(doc(db, 'users', user.uid), { name:user.displayName || user.email, email:user.email, ...profile, searchKeywords: keywords }, { merge: true }); setStatus('Profile updated.'); }
  async function runSearch(e) { e.preventDefault(); if (!search.trim()) return; const snap = await getDocs(query(collection(db, 'users'), where('searchKeywords', 'array-contains', search.trim().toLowerCase()))); setResults(snap.docs.map(d => ({ id:d.id, ...d.data() }))); }
  const change = (key) => (e) => setProfile({ ...profile, [key]: e.target.value });
  return <section className="container-shell grid gap-6 py-10 lg:grid-cols-[1fr_1fr]"><form onSubmit={save} className="card space-y-4 p-6"><h1 className="text-3xl font-black">My profile</h1><img src={profile.avatar} alt="Avatar" className="h-28 w-28 rounded-full border object-cover"/><input className="input" placeholder="Avatar URL" value={profile.avatar} onChange={change('avatar')} /><textarea className="input" placeholder="Bio" value={profile.bio} onChange={change('bio')} /><input className="input" placeholder="Skills" value={profile.skills} onChange={change('skills')} /><input className="input" placeholder="College" value={profile.college} onChange={change('college')} /><input className="input" placeholder="Company" value={profile.company} onChange={change('company')} /><button className="btn-primary">Save profile</button>{status && <p>{status}</p>}</form><div className="card space-y-4 p-6"><h2 className="text-2xl font-black">Search people</h2><form onSubmit={runSearch} className="flex gap-2"><input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="skill, college, company"/><button className="btn-secondary">Search</button></form>{results.map(r=><div key={r.id} className="flex gap-4 rounded-xl border p-3"><img src={r.avatar || r.photoURL} alt="" className="h-14 w-14 rounded-full"/><div><h3 className="font-bold">{r.name || r.email}</h3><p className="text-sm text-slate-500">{r.company} {r.college}</p></div></div>)}</div></section>;
}
